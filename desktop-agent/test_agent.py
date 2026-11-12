import unittest
from unittest.mock import patch, Mock
import wifi_pulse_agent as agent


class LocalAgentTests(unittest.TestCase):
    def test_gateway_rejects_public_and_command_injection(self):
        for candidate in ('8.8.8.8', '127.0.0.1', '192.168.1.1; rm -rf /', '0.0.0.0'):
            with self.assertRaises(ValueError):
                agent.validate_gateway(candidate)
        self.assertEqual(agent.validate_gateway('192.168.1.1'), '192.168.1.1')

    def test_gateway_windows_route(self):
        with patch('wifi_pulse_agent.platform.system', return_value='Windows'), \
             patch('wifi_pulse_agent.subprocess.run', return_value=Mock(stdout=' 0.0.0.0    0.0.0.0    192.168.1.1  192.168.1.100    25')):
            self.assertEqual(agent.detect_gateway(), '192.168.1.1')

    def test_gateway_icmp_may_be_blocked(self):
        state = agent.classify(True, False, True, True)
        self.assertIn('Internet reachable', state[0])
        self.assertEqual(state[1], 'low')

    def test_upstream_evidence_is_not_certain(self):
        state = agent.classify(True, True, False, False)
        self.assertIn('Possible', state[0])
        self.assertEqual(state[1], 'low')
        self.assertIn('firewall', state[2])

    def test_two_external_failures_not_diagnosed_as_wifi(self):
        result = agent.classify(True, False, False, False)
        self.assertIn('undetermined', result[0])

    def test_one_endpoint_down_not_full_outage(self):
        self.assertEqual(agent.classify(True, True, True, False)[1], 'low')

    def test_outage_grouping_and_recovery(self):
        def entry(t, ok):
            return {'timestamp_utc': t, 'internet_a_tcp_ms': 10 if ok else None,
                    'internet_b_tcp_ms': 12 if ok else None, 'gateway_icmp_ms': 3}
        records = [entry('00:00', True), entry('00:05', False), entry('00:10', False), entry('00:15', True)]
        episodes = agent.outage_events(records)
        self.assertEqual(len(episodes), 1)
        self.assertEqual(episodes[0]['start'], '00:05')
        self.assertEqual(episodes[0]['restored'], '00:15')
        self.assertIn('not exact outage', agent.report(records, '192.168.1.1'))

    def test_isolated_failure_not_reported_as_outage(self):
        rows = [{'timestamp_utc': 'x', 'internet_a_tcp_ms': None, 'internet_b_tcp_ms': None},
                {'timestamp_utc': 'y', 'internet_a_tcp_ms': 2, 'internet_b_tcp_ms': 3}]
        self.assertEqual(agent.outage_events(rows), [])

    def test_probe_collects_mocked_readings(self):
        with patch('wifi_pulse_agent.ping_gateway', return_value=3.2), \
             patch('wifi_pulse_agent.tcp_probe', side_effect=[14.1, 16.2]):
            result = agent.probe_once('192.168.1.1')
            self.assertEqual(result['gateway_icmp_ms'], 3.2)
            self.assertEqual(result['internet_b_tcp_ms'], 16.2)
            self.assertEqual(result['assessment'], 'Internet reachable')


if __name__ == '__main__':
    unittest.main()

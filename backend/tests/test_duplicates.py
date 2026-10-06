import unittest
from app.services.duplicates import find_duplicate_issue, haversine_distance

class DummyIssue:
    def __init__(self, issue_id, issue_type, lat, lng, status="Reported"):
        self.id = issue_id
        self.type = issue_type
        self.lat = lat
        self.lng = lng
        self.status = status

class TestDuplicateMerging(unittest.TestCase):

    def setUp(self):
        # Base coordinate: Market St SF (37.7749, -122.4194)
        self.base_lat = 37.7749
        self.base_lng = -122.4194

        # Point ~10 meters away: (37.77499, -122.4194)
        self.near_lat = 37.77499
        self.near_lng = -122.4194

        # Point ~100 meters away: (37.7758, -122.4194)
        self.far_lat = 37.7758
        self.far_lng = -122.4194

        self.existing = [
            DummyIssue(1, "pothole", self.base_lat, self.base_lng, "Reported")
        ]

    def test_within_20m_same_type_merges(self):
        """Case 1: Report within 20 meters with the same issue type should find duplicate match."""
        match = find_duplicate_issue(self.existing, self.near_lat, self.near_lng, "pothole", max_meters=20.0)
        self.assertIsNotNone(match)
        self.assertEqual(match.id, 1)

    def test_within_20m_different_type_does_not_merge(self):
        """Case 2: Report within 20 meters but with a different issue type should NOT merge."""
        match = find_duplicate_issue(self.existing, self.near_lat, self.near_lng, "garbage", max_meters=20.0)
        self.assertIsNone(match)

    def test_over_20m_same_type_does_not_merge(self):
        """Case 3: Report over 20 meters away with the same issue type should NOT merge."""
        match = find_duplicate_issue(self.existing, self.far_lat, self.far_lng, "pothole", max_meters=20.0)
        self.assertIsNone(match)

if __name__ == "__main__":
    unittest.main()

const MOCK_MATCHES = [
    { _id: 123, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", utcDate: "01/21/2023" },
    { _id: 126, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", utcDate: "02/21/2023" },
    { _id: 129, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "FINISHED", utcDate: "01/23/2023" },
    { _id: 132, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", utcDate: "01/23/2023" },
    { _id: 135, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", utcDate: "01/23/2023" },
    { _id: 138, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "IN_PLAY", utcDate: "01/23/2023" },
    { _id: 141, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "PAUSED", utcDate: "01/23/2023" },
    { _id: 144, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", utcDate: "01/23/2023" },
    { _id: 147, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", utcDate: "01/24/2023" },
    { _id: 150, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "CANCELLED", utcDate: "01/25/2023" },
    { _id: 153, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "UPCOMING", utcDate: (new Date()).toLocaleDateString() },
    { _id: 156, homeTeam: 200, awayTeam: 201, head2head: "200201", status: "ONGOING", utcDate: (new Date()).toLocaleDateString() }
];

module.exports = {
    MOCK_MATCHES
}
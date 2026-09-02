// Server-side handler for Daily Betting Results & Game Recaps
// File location: /api/results.js

export default async function handler(req, res) {
  try {
    const { date, league } = req.query || {};
    const targetDate = date || "2026-08-31";
    const selectedLeague = (league || "ALL").toUpperCase();

    // Comprehensive sample datasets indexed by date
    const datasets = {
      "2026-08-31": [
        {
          id: "game-mlb-1",
          league: "MLB",
          away_team: "Milwaukee Brewers",
          away_abbr: "MIL",
          home_team: "Chicago Cubs",
          home_abbr: "CHC",
          away_score: 9,
          home_score: 4,
          status: "Final",
          period_scores: {
            away: [1, 0, 3, 0, 0, 2, 0, 0, 3],
            home: [0, 2, 0, 0, 0, 1, 0, 1, 0]
          },
          recap: "The Brewers offense erupted for 9 runs on 14 hits, powered by a 3-run 3rd inning to cover the +1.5 run line and win outright as +104 underdogs. Over 10.0 cash cleanly in the top of the 9th.",
          moneyline: {
            away: { open: "+108", close: "+104", winner: true },
            home: { open: "-126", close: "-124", winner: false }
          },
          spread: {
            away: { line: "+1.5", open_odds: "-192", close_odds: "-183", covered: true },
            home: { line: "-1.5", open_odds: "+158", close_odds: "+151", covered: false }
          },
          total: {
            line: 10.0,
            over: { open_odds: "-118", close_odds: "-107", hit: true },
            under: { open_odds: "-104", close_odds: "-112", hit: false }
          },
          team_totals: {
            away: { line: 4.5, open_odds: "-115", close_odds: "-110", actual: 9, hit: "over" },
            home: { line: 5.5, open_odds: "-110", close_odds: "-115", actual: 4, hit: "under" }
          }
        },
        {
          id: "game-mlb-2",
          league: "MLB",
          away_team: "Los Angeles Dodgers",
          away_abbr: "LAD",
          home_team: "San Diego Padres",
          home_abbr: "SD",
          away_score: 3,
          home_score: 2,
          status: "Final (F/11)",
          period_scores: {
            away: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
            home: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]
          },
          recap: "A classic pitching duel went to extra innings. Dodgers pushed across the winning run on a sacrifice fly in the 11th. Under 8.5 hit easily.",
          moneyline: {
            away: { open: "-145", close: "-135", winner: true },
            home: { open: "+125", close: "+115", winner: false }
          },
          spread: {
            away: { line: "-1.5", open_odds: "+115", close_odds: "+120", covered: false },
            home: { line: "+1.5", open_odds: "-135", close_odds: "-140", covered: true }
          },
          total: {
            line: 8.5,
            over: { open_odds: "-110", close_odds: "-105", hit: false },
            under: { open_odds: "-110", close_odds: "-115", hit: true }
          },
          team_totals: {
            away: { line: 4.5, open_odds: "-120", close_odds: "-115", actual: 3, hit: "under" },
            home: { line: 3.5, open_odds: "-105", close_odds: "-110", actual: 2, hit: "under" }
          }
        },
        {
          id: "game-nfl-1",
          league: "NFL",
          away_team: "Baltimore Ravens",
          away_abbr: "BAL",
          home_team: "Kansas City Chiefs",
          home_abbr: "KC",
          away_score: 24,
          home_score: 27,
          status: "Final",
          period_scores: {
            away: [7, 3, 7, 7],
            home: [7, 6, 7, 7]
          },
          recap: "The Chiefs held off the Ravens in a thrilling contest, winning 27-24. Ravens covered the +3.5 line. Total pushed exactly at 51.0.",
          moneyline: {
            away: { open: "+155", close: "+145", winner: false },
            home: { open: "-180", close: "-165", winner: true }
          },
          spread: {
            away: { line: "+3.5", open_odds: "-110", close_odds: "-108", covered: true },
            home: { line: "-3.5", open_odds: "-110", close_odds: "-112", covered: false }
          },
          total: {
            line: 51.0,
            over: { open_odds: "-110", close_odds: "-110", hit: false, push: true },
            under: { open_odds: "-110", close_odds: "-110", hit: false, push: true }
          },
          team_totals: {
            away: { line: 23.5, open_odds: "-115", close_odds: "-110", actual: 24, hit: "over" },
            home: { line: 27.5, open_odds: "-110", close_odds: "-115", actual: 27, hit: "under" }
          }
        },
        {
          id: "game-ncaaf-1",
          league: "NCAAF",
          away_team: "Georgia Bulldogs",
          away_abbr: "UGA",
          home_team: "Clemson Tigers",
          home_abbr: "CLEM",
          away_score: 34,
          home_score: 3,
          status: "Final",
          period_scores: {
            away: [0, 6, 15, 13],
            home: [0, 0, 3, 0]
          },
          recap: "Georgia dominated Clemson in the second half, storming to a 34-3 blowout. Bulldogs covered the -12.5 spread comfortably.",
          moneyline: {
            away: { open: "-450", close: "-500", winner: true },
            home: { open: "+350", close: "+380", winner: false }
          },
          spread: {
            away: { line: "-12.5", open_odds: "-110", close_odds: "-115", covered: true },
            home: { line: "+12.5", open_odds: "-110", close_odds: "-105", covered: false }
          },
          total: {
            line: 48.5,
            over: { open_odds: "-110", close_odds: "-108", hit: false },
            under: { open_odds: "-110", close_odds: "-112", hit: true }
          },
          team_totals: {
            away: { line: 30.5, open_odds: "-110", close_odds: "-115", actual: 34, hit: "over" },
            home: { line: 17.5, open_odds: "-115", close_odds: "-110", actual: 3, hit: "under" }
          }
        },
        {
          id: "game-nba-1",
          league: "NBA",
          away_team: "Boston Celtics",
          away_abbr: "BOS",
          home_team: "New York Knicks",
          home_abbr: "NYK",
          away_score: 112,
          home_score: 104,
          status: "Final",
          period_scores: {
            away: [28, 31, 25, 28],
            home: [25, 27, 26, 26]
          },
          recap: "Boston shot 48% from 3-point range to beat the Knicks 112-104 at MSG, covering the -5.5 spread. Total hit Over 214.5.",
          moneyline: {
            away: { open: "-210", close: "-230", winner: true },
            home: { open: "+175", close: "+190", winner: false }
          },
          spread: {
            away: { line: "-5.5", open_odds: "-110", close_odds: "-112", covered: true },
            home: { line: "+5.5", open_odds: "-110", close_odds: "-108", covered: false }
          },
          total: {
            line: 214.5,
            over: { open_odds: "-112", close_odds: "-115", hit: true },
            under: { open_odds: "-108", close_odds: "-105", hit: false }
          },
          team_totals: {
            away: { line: 109.5, open_odds: "-110", close_odds: "-115", actual: 112, hit: "over" },
            home: { line: 104.5, open_odds: "-105", close_odds: "-110", actual: 104, hit: "under" }
          }
        },
        {
          id: "game-nba-2",
          league: "NBA",
          away_team: "Golden State Warriors",
          away_abbr: "GSW",
          home_team: "Los Angeles Lakers",
          home_abbr: "LAL",
          away_score: 118,
          home_score: 122,
          status: "Final (OT)",
          period_scores: {
            away: [30, 28, 29, 23, 8],
            home: [26, 32, 27, 25, 12]
          },
          recap: "Lakers edged the Warriors in OT 122-118. Warriors covered +5.5 spread. Game Total exploded Over 225.0.",
          moneyline: {
            away: { open: "+180", close: "+165", winner: false },
            home: { open: "-215", close: "-195", winner: true }
          },
          spread: {
            away: { line: "+5.5", open_odds: "-110", close_odds: "-108", covered: true },
            home: { line: "-5.5", open_odds: "-110", close_odds: "-112", covered: false }
          },
          total: {
            line: 225.0,
            over: { open_odds: "-110", close_odds: "-115", hit: true },
            under: { open_odds: "-110", close_odds: "-105", hit: false }
          },
          team_totals: {
            away: { line: 109.5, open_odds: "-110", close_odds: "-108", actual: 118, hit: "over" },
            home: { line: 115.5, open_odds: "-115", close_odds: "-112", actual: 122, hit: "over" }
          }
        }
      ],
      "2026-09-01": [
        {
          id: "game-mlb-3",
          league: "MLB",
          away_team: "New York Yankees",
          away_abbr: "NYY",
          home_team: "Boston Red Sox",
          home_abbr: "BOS",
          away_score: 7,
          home_score: 2,
          status: "Final",
          period_scores: {
            away: [2, 0, 1, 0, 3, 0, 1, 0, 0],
            home: [0, 1, 0, 0, 0, 1, 0, 0, 0]
          },
          recap: "Yankees launched 3 home runs at Fenway to cover the -1.5 run line as -135 favorites.",
          moneyline: {
            away: { open: "-140", close: "-135", winner: true },
            home: { open: "+120", close: "+115", winner: false }
          },
          spread: {
            away: { line: "-1.5", open_odds: "+120", close_odds: "+125", covered: true },
            home: { line: "+1.5", open_odds: "-140", close_odds: "-145", covered: false }
          },
          total: {
            line: 9.5,
            over: { open_odds: "-105", close_odds: "-110", hit: false },
            under: { open_odds: "-115", close_odds: "-110", hit: true }
          },
          team_totals: {
            away: { line: 5.0, open_odds: "-110", close_odds: "-115", actual: 7, hit: "over" },
            home: { line: 4.0, open_odds: "-105", close_odds: "-110", actual: 2, hit: "under" }
          }
        },
        {
          id: "game-nfl-2",
          league: "NFL",
          away_team: "Dallas Cowboys",
          away_abbr: "DAL",
          home_team: "Philadelphia Eagles",
          home_abbr: "PHI",
          away_score: 28,
          home_score: 31,
          status: "Final",
          period_scores: {
            away: [7, 7, 7, 7],
            home: [10, 7, 7, 7]
          },
          recap: "Eagles won on a game-ending 42-yard FG. Cowboys covered +3.5. Over 51.5 hit.",
          moneyline: {
            away: { open: "+160", close: "+150", winner: false },
            home: { open: "-190", close: "-175", winner: true }
          },
          spread: {
            away: { line: "+3.5", open_odds: "-110", close_odds: "-108", covered: true },
            home: { line: "-3.5", open_odds: "-110", close_odds: "-112", covered: false }
          },
          total: {
            line: 51.5,
            over: { open_odds: "-110", close_odds: "-112", hit: true },
            under: { open_odds: "-110", close_odds: "-108", hit: false }
          },
          team_totals: {
            away: { line: 23.5, open_odds: "-110", close_odds: "-105", actual: 28, hit: "over" },
            home: { line: 27.5, open_odds: "-115", close_odds: "-110", actual: 31, hit: "over" }
          }
        }
      ]
    };

    let games = datasets[targetDate] || datasets["2026-08-31"];

    if (selectedLeague !== "ALL") {
      games = games.filter(g => g.league.toUpperCase() === selectedLeague);
    }

    // Compute aggregate summary metrics dynamically
    let overCount = 0, underCount = 0, totalPushCount = 0;
    let favCovered = 0, dogCovered = 0, spreadPushCount = 0;
    let favWon = 0, dogWon = 0;
    let ttOver = 0, ttUnder = 0, ttPush = 0;

    games.forEach(g => {
      // Over/Under
      if (g.total.over.push) {
        totalPushCount++;
      } else if (g.total.over.hit) {
        overCount++;
      } else if (g.total.under.hit) {
        underCount++;
      }

      // Moneyline favorite vs underdog
      const awayMlNum = parseInt(g.moneyline.away.close);
      const homeMlNum = parseInt(g.moneyline.home.close);

      let awayIsFav = awayMlNum < homeMlNum;
      if (g.moneyline.away.winner) {
        if (awayIsFav) favWon++; else dogWon++;
      } else if (g.moneyline.home.winner) {
        if (!awayIsFav) favWon++; else dogWon++;
      }

      // Spread favorite vs underdog
      const awaySpreadNum = parseFloat(g.spread.away.line);
      const homeSpreadNum = parseFloat(g.spread.home.line);
      const awayIsSpreadFav = awaySpreadNum < 0;

      if (g.spread.away.push || g.spread.home.push) {
        spreadPushCount++;
      } else if (g.spread.away.covered) {
        if (awayIsSpreadFav) favCovered++; else dogCovered++;
      } else if (g.spread.home.covered) {
        if (!awayIsSpreadFav) favCovered++; else dogCovered++;
      }

      // Team Totals
      if (g.team_totals) {
        ['away', 'home'].forEach(side => {
          const tt = g.team_totals[side];
          if (tt) {
            if (tt.hit === 'over') ttOver++;
            else if (tt.hit === 'under') ttUnder++;
            else if (tt.hit === 'push') ttPush++;
          }
        });
      }
    });

    const payload = {
      date: targetDate,
      summary: {
        total_games: games.length,
        over_under: { over: overCount, under: underCount, push: totalPushCount },
        spread: { favorites_covered: favCovered, underdogs_covered: dogCovered, pushes: spreadPushCount },
        moneyline: { favorites_won: favWon, underdogs_won: dogWon },
        team_totals: { over: ttOver, under: ttUnder, push: ttPush }
      },
      games: games
    };

    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

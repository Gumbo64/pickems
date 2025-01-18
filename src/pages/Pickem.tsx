import { useState, useEffect } from 'react';
import classNames from 'classnames';
import { Firestore, getDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, User } from 'firebase/auth';
import './User.css';

type UserPanelProps = {
  db: Firestore;
};

const auth = getAuth();

const Pickem = ({ db }: UserPanelProps) => {
  const [matches, setMatches] = useState<
    { matchId: number; team1Id: string; team2Id: string; category: string; points: string; closeTime: any, open: boolean }[]
  >([]);
  const [userPicks, setUserPicks] = useState<{ [key: number]: string }>({});
  const fetchMatches = async () => {
    try {
      const matchesDocRef = doc(db, 'matches', 'matchData');
      const matchesDocSnap = await getDoc(matchesDocRef);

      if (matchesDocSnap.exists()) {
        const matchesData = matchesDocSnap.data();
        let matchList = Object.keys(matchesData).map((id) => ({
          matchId: matchesData[id].matchId,
          team1Id: matchesData[id].team1Id,
          team2Id: matchesData[id].team2Id,
          category: matchesData[id].category,
          points: matchesData[id].points,
          closeTime: matchesData[id].closeTime,
          open: matchesData[id].open,
        }));
        let time = new Date().getTime() / 1000;
        matchList = matchList.filter((match) => match.open && match.closeTime.seconds >= time);  // Filter out matches that are closed
        matchList = matchList.sort((a, b) => a.closeTime.seconds - b.closeTime.seconds);

        setMatches(matchList);
      }

      const userDocRef = doc(db, 'users', (auth.currentUser as User).uid );
      const userDocSnap = await getDoc(userDocRef);
      userDocSnap.data();
      if (userDocSnap.exists()) {
        const picks = userDocSnap.data().picks;
        setUserPicks(picks);
      }
    } catch (error) {
      console.error('Error fetching matches or user picks: ', error);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [db]);

  // Correct so user cannot change pick after pick time (add a listener for it)
  const handlePick = async (matchId: number, teamId: string) => {
    console.log('------')
    await fetchMatches();

    const match = matches.find((m) => m.matchId === matchId);

    if (!match) {
      alert('Match has already started or closed.');
      return;
    } else {
      const updatedPicks = { ...userPicks, [matchId]: teamId };
      console.log(matches);
      console.log(match);
      console.log(userPicks);
      console.log(updatedPicks);
      const userDocRef = doc(db, 'users', (auth.currentUser as User).uid);
      await updateDoc(userDocRef, {
        picks: updatedPicks,
      });
    }

    await fetchMatches();
  }

  return (
    <div>
      <h1>Pick'em Matches</h1>
      {matches.length === 0 ? (
        <p>No matches available.</p>
      ) : (
        matches.map((match) => (
          <div key={match.matchId} className="match-container">
            <div className="teams">
              <div
                className={classNames('team', {
                  chosen: userPicks[match.matchId] === match.team1Id,
                  unchosen: userPicks[match.matchId] === match.team2Id,
                })}
                onClick={() => handlePick(match.matchId, match.team1Id)}
              >
                <p>{match.team1Id}</p>
              </div>
              <div
                className={classNames('team', {
                  chosen: userPicks[match.matchId] === match.team2Id,
                  unchosen: userPicks[match.matchId] === match.team1Id,
                })}
                onClick={() => handlePick(match.matchId, match.team2Id)}
              >
                <p>{match.team2Id}</p>
              </div>
            </div>
            <div className="details">
              <p>Category: {match.category}</p>
              <p>Points: {match.points}</p>
              <p>Close Time: {new Date(match.closeTime.seconds * 1000).toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Pickem;
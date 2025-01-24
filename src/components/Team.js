import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

const ManageTeams = () => {
  const { className, projectName } = useParams();
  const [teamName, setTeamName] = useState('');
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchTeamsAndStudents = async () => {
      try {
        const db = getFirestore();

        // Fetch students
        const studentsRef = collection(db, 'classrooms', className, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          email: doc.id,
          name: `${doc.data().firstName} ${doc.data().lastName}`,
        }));
        setStudents(studentsList);

        // Fetch teams
        const teamsRef = collection(db, 'classrooms', className, 'Projects', projectName, 'teams');
        const teamsSnapshot = await getDocs(teamsRef);
        const teamsList = teamsSnapshot.docs.map(doc => ({
          teamName: doc.id,
          students: Object.entries(doc.data()).map(([email, name]) => ({ email, name })),
        }));
        setTeams(teamsList);
      } catch (error) {
        console.error('Error fetching teams or students:', error);
      }
    };

    fetchTeamsAndStudents();
  }, [className, projectName]);

  const handleCreateTeam = () => {
    if (teamName && !teams.some(team => team.teamName === teamName)) {
      setTeams([...teams, { teamName, students: [] }]);
      setTeamName('');
    }
  };

  const handleSaveChanges = () => {
    const teamsData = teams.map(team => ({
      teamName: team.teamName,
      students: team.students.map(student => student.email),
    }));

    fetch(`/classroom/${className}/project/${projectName}/manage_team`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teams: teamsData,
        class_name: className,
        project_name: projectName,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          alert(data.message);
        }
      })
      .catch(error => alert('An error occurred while saving teams.'));
  };

  const handleDragStart = (event, student) => {
    event.dataTransfer.setData('email', student.email);
    event.dataTransfer.setData('name', student.name);
  };

  const handleDrop = (event, teamName) => {
    event.preventDefault();
    const email = event.dataTransfer.getData('email');
    const name = event.dataTransfer.getData('name');

    if (email && name) {
      const updatedTeams = teams.map(team => {
        if (team.teamName === teamName) {
          // Ensure the student is not already in the team
          if (!team.students.some(student => student.email === email)) {
            return { ...team, students: [...team.students, { email, name }] };
          }
        }
        return team;
      });
      setTeams(updatedTeams);
    }
  };

  const handleRemoveStudent = (email, teamName) => {
    const updatedTeams = teams.map(team => {
      if (team.teamName === teamName) {
        return {
          ...team,
          students: team.students.filter(student => student.email !== email),
        };
      }
      return team;
    });
    setTeams(updatedTeams);
  };

  return (
    <div className="content-wrapper">
      <h1><i className="bi bi-people-fill"></i> Manage Teams</h1>

      <div className="mt-3">
        <input
          type="text"
          id="team_name"
          className="form-input"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter Team Name"
        />
        <button className="btn btn-secondary" onClick={handleCreateTeam}>
          <i className="bi bi-plus-circle"></i> Create Team
        </button>
      </div>

      <div className="mt-4">
        <div id="unassigned-students-section">
          <h4>Unassigned Students</h4>
          <ul className="student-list">
            {students.length === 0 ? (
              <li className="no-students">All students assigned</li>
            ) : (
              students.map((student) => (
                <li
                  key={student.email}
                  className="student-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, student)}
                >
                  {student.name}
                </li>
              ))
            )}
          </ul>
        </div>

        <div id="teams-container">
          {teams.map((team) => (
            <div
              key={team.teamName}
              className="team-list"
              onDrop={(e) => handleDrop(e, team.teamName)}
              onDragOver={(e) => e.preventDefault()}
            >
              <h4>{team.teamName}</h4>
              <div className="team-box">
                {team.students.length === 0 ? (
                  <p>No students assigned</p>
                ) : (
                  team.students.map((student) => (
                    <div key={student.email} className="student-box">
                      {student.name}
                      <button
                        className="btn btn-danger btn-sm ml-2"
                        onClick={() => handleRemoveStudent(student.email, team.teamName)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary mt-3" onClick={handleSaveChanges}>
        <i className="bi bi-save"></i> Save Changes
      </button>

      <Link to={`/classroom/${className}/project/${projectName}`} className="btn btn-secondary back-btn mt-4">
        <i className="bi bi-arrow-left me-2"></i> Back to Project
      </Link>
    </div>
  );
};

export default ManageTeams;

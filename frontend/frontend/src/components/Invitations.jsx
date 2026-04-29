import { useEffect, useState } from "react";
import API from "../api/api";

function Invitations({ user }) {
  const [invites, setInvites] = useState([]);
  const [responses, setResponses] = useState({});

  const fetchInvites = async () => {
    try {
      const res = await API.get(`invitations/?editor_id=${user.id}`);
      setInvites(res.data);
    } catch (err) {
      console.log("INVITE ERROR:", err);
    }
  };

  const selectResponse = (inviteId, action) => {
    setResponses({
      ...responses,
      [inviteId]: action,
    });
  };

  const submitResponse = async (inviteId) => {
    const action = responses[inviteId];

    if (!action) {
      alert("Please select accept or decline");
      return;
    }

    try {
      await API.post("invitations/respond/", {
        invite_id: inviteId,
        action: action,
      });

      fetchInvites();
    } catch (err) {
      console.log("RESPONSE ERROR:", err.response?.data);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  return (
    <div className="dashboard-card invite-card">
      <h3>Invitations</h3>

      {invites.length === 0 ? (
        <p>No invites</p>
      ) : (
        <table className="invite-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Creator</th>
              <th>Decision</th>
              <th>Submit</th>
            </tr>
          </thead>

          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.project_name}</td>
                <td>{invite.creator}</td>

                <td>
                  <div className="decision-buttons">
                    <button
                      type="button"
                      className={
                        responses[invite.id] === "accept"
                          ? "accept-btn selected"
                          : "accept-btn"
                      }
                      onClick={() => selectResponse(invite.id, "accept")}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      className={
                        responses[invite.id] === "reject"
                          ? "decline-btn selected"
                          : "decline-btn"
                      }
                      onClick={() => selectResponse(invite.id, "reject")}
                    >
                      Decline
                    </button>
                  </div>
                </td>

                <td>
                  <button
                    type="button"
                    className="submit-response-btn"
                    onClick={() => submitResponse(invite.id)}
                  >
                    Submit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Invitations;
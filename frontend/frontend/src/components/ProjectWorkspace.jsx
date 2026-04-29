// FILE PATH: frontend/frontend/src/components/ProjectWorkspace.jsx
// NEW FILE — create it

/**
 * ProjectWorkspace
 *
 * Routes the user to the right view based on their role and invite status:
 *
 *   editor  +  invite_status === "accepted"  →  VideoEditor  (full edit suite)
 *   viewer  (any invite_status)              →  ViewerProjectPage  (video + comments)
 *   editor  +  invite NOT accepted yet       →  ViewerProjectPage  (read-only until accepted)
 */

import VideoEditor       from "./VideoEditor";
import ViewerProjectPage from "./ViewerProjectPage";

export default function ProjectWorkspace({ project, user, token, onBack }) {
  const isEditor   = user?.role === "editor";
  const isAccepted = project?.invite_status === "accepted";

  if (isEditor && isAccepted) {
    return (
      <VideoEditor
        project={project}
        user={user}
        token={token}
        onBack={onBack}
      />
    );
  }

  // Viewer, OR editor whose invite hasn't been accepted yet
  return (
    <ViewerProjectPage
      project={project}
      user={user}
      token={token}
      onBack={onBack}
    />
  );
}
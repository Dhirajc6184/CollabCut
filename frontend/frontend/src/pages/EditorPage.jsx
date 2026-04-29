import { useParams } from "react-router-dom";

function EditorPage() {
  const { id } = useParams();

  return (
    <div style={{ padding: "20px", color: "white", background: "#111", height: "100vh" }}>
      <h1>🎬 Editor Page</h1>
      <p>Project ID: {id}</p>
    </div>
  );
}

export default EditorPage;
// FILE PATH: frontend/frontend/src/api/api.jsx
// REPLACE ENTIRE FILE

import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// Base URL for the editor app (used by VideoEditor, ViewerProjectPage, etc.)
export const EDITOR_API = "http://127.0.0.1:8000/api/editor";

export default API;
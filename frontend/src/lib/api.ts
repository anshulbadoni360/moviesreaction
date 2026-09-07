const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.188:8000";

export async function fetchBenchmarkNorms() {
  try {
    const res = await fetch(`${API_BASE}/api/benchmark/norms`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch benchmark norms");
    return await res.json();
  } catch (err) {
    console.warn(`Could not connect to FastAPI backend on ${API_BASE}:`, err);
    return null;
  }
}

export async function fetchVideoHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/videos/history`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch video history");
    return await res.json();
  } catch (err) {
    console.warn(`Could not connect to FastAPI backend on ${API_BASE}:`, err);
    return [];
  }
}

export async function deleteVideoAnalysis(videoId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/videos/${videoId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete video analysis");
    return await res.json();
  } catch (err) {
    console.error(`Failed to delete video ${videoId}:`, err);
    throw err;
  }
}

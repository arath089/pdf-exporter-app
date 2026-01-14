export async function createPdf({ isWidget, clientId, rawText, preset }) {
  const payload = { rawText, preset, clientId };

  console.log("[createPdf] mode=", isWidget ? "widget" : "web");
  console.log(
    "[createPdf] payload chars=",
    rawText?.length,
    "preset=",
    preset,
    "clientId=",
    clientId
  );

  if (isWidget && window.openai?.callTool) {
    console.log("[createPdf] calling MCP tool create_pdf");
    const result = await window.openai.callTool("create_pdf", payload);
    console.log("[createPdf] tool result=", result);
    return result?.structuredContent ?? result;
  }

  const url = "/api/create-pdf";
  console.log("[createPdf] POST", url);

  const t0 = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-client-id": clientId },
    body: JSON.stringify(payload),
  });

  const dt = Math.round(performance.now() - t0);
  console.log("[createPdf] response status=", res.status, "timeMs=", dt);

  let json;
  try {
    json = await res.json();
  } catch (e) {
    console.log("[createPdf] failed to parse JSON", e);
    throw new Error("Server returned non-JSON response");
  }

  console.log("[createPdf] response json=", json);

  if (!res.ok) throw new Error(json?.error || JSON.stringify(json));
  return json;
}

# Connect Web Chat to MCP Platform

The simplest channel. Any web page can talk to the gateway.

## API
```
POST http://localhost:3000/chat
{"message": "show my issues", "channel": "web"}
```

## Minimal HTML Chat
Save as `chat.html`, start gateway, open in browser:

```html
<!DOCTYPE html>
<html><body>
  <div id="log" style="height:400px;overflow-y:auto;border:1px solid #ccc;padding:10px;margin-bottom:10px"></div>
  <input id="in" style="width:80%" placeholder="Ask about Jira or Confluence...">
  <button onclick="go()">Send</button>
  <script>
    async function go() {
      const i = document.getElementById("in"), m = i.value.trim(); if (!m) return;
      add("You: " + m); i.value = "";
      try {
        const r = await (await fetch("http://localhost:3000/chat", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m,channel:"web"})})).json();
        add("Bot: " + (r.reply || r.error || "No response"));
      } catch(e) { add("Error: " + e.message); }
    }
    function add(t) { const d = document.getElementById("log"); d.innerHTML += "<p>"+t.replace(/\n/g,"<br>")+"</p>"; d.scrollTop = d.scrollHeight; }
    document.getElementById("in").onkeypress = e => { if (e.key==="Enter") go(); };
  </script>
</body></html>
```

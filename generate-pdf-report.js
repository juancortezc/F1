const fs = require('fs');
const path = require('path');

// Simple HTML to PDF converter using browser print
const markdownToHtml = (markdown) => {
  // Basic markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```css([\s\S]*?)```/g, '<pre class="code-css"><code>$1</code></pre>')
    .replace(/```tsx([\s\S]*?)```/g, '<pre class="code-tsx"><code>$1</code></pre>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(cell => cell.trim());
      const isHeader = cells.some(cell => cell.includes('---'));
      if (isHeader) return '';
      const tag = cells[0].includes('Tab') ? 'th' : 'td';
      return '<tr>' + cells.map(cell => `<${tag}>${cell.trim()}</${tag}>`).join('') + '</tr>';
    })
    // Lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Emojis for visual elements
    .replace(/✅/g, '<span class="emoji-check">✅</span>')
    .replace(/❌/g, '<span class="emoji-cross">❌</span>')
    .replace(/🔴/g, '<span class="emoji-red">🔴</span>')
    .replace(/🟡/g, '<span class="emoji-yellow">🟡</span>')
    .replace(/🟢/g, '<span class="emoji-green">🟢</span>')
    .replace(/🗑️/g, '<span class="emoji-trash">🗑️</span>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/---/g, '<hr>');

  // Wrap in paragraphs
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '').replace(/<p><h/g, '<h').replace(/<\/h\d><\/p>/g, (match) => match.replace('</p>', ''));
  
  return html;
};

const generateHtmlReport = () => {
  const markdown = fs.readFileSync(path.join(__dirname, 'F1-App-Structure-Report.md'), 'utf8');
  const content = markdownToHtml(markdown);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>F1 Night App Structure Report</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        h1 {
            color: #E10600;
            border-bottom: 3px solid #E10600;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        
        h2 {
            color: #1A1A1A;
            border-bottom: 2px solid #ddd;
            padding-bottom: 8px;
            margin-top: 25px;
        }
        
        h3 {
            color: #242424;
            margin-top: 20px;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background: #1A1A1A;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        code.inline {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #E10600;
        }
        
        pre {
            background: #1A1A1A;
            color: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
        }
        
        pre.code-css code {
            color: #00D2BE;
        }
        
        pre.code-tsx code {
            color: #00FF88;
        }
        
        hr {
            border: none;
            border-top: 2px solid #E10600;
            margin: 30px 0;
        }
        
        li {
            margin: 5px 0;
        }
        
        .emoji-check { color: #00FF88; }
        .emoji-cross { color: #E10600; }
        .emoji-red { color: #E10600; }
        .emoji-yellow { color: #FFA500; }
        .emoji-green { color: #00FF88; }
        .emoji-trash { opacity: 0.7; }
        
        .download-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #E10600;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        
        .download-button:hover {
            background: #C10500;
        }
        
        @media screen and (max-width: 600px) {
            body { padding: 10px; }
            table { font-size: 0.9em; }
            .download-button { position: static; margin-bottom: 20px; width: 100%; }
        }
    </style>
</head>
<body>
    <button class="download-button no-print" onclick="window.print()">📥 Download as PDF</button>
    ${content}
    <script>
        // Auto-suggest filename when printing
        document.title = 'F1-Night-App-Structure-Report-' + new Date().toISOString().split('T')[0];
    </script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(__dirname, 'F1-App-Structure-Report.html'), html);
  console.log('HTML report generated successfully!');
  console.log('Open F1-App-Structure-Report.html in your browser and use Print > Save as PDF');
};

generateHtmlReport();
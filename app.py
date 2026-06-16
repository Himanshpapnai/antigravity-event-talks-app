import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": None
}

def parse_release_notes():
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code != 200:
            return None, f"Failed to fetch feed: HTTP {response.status_code}"
        
        root = ET.fromstring(response.content)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", ns)
        
        items = []
        for entry in entries:
            date_str = entry.find("atom:title", ns).text
            updated = entry.find("atom:updated", ns).text
            
            entry_id_elem = entry.find("atom:id", ns)
            entry_id = entry_id_elem.text if entry_id_elem is not None else ""
            
            link_elem = entry.find("atom:link", ns)
            link = link_elem.attrib.get("href") if link_elem is not None else ""
            
            content_elem = entry.find("atom:content", ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            soup = BeautifulSoup(content_html, 'html.parser')
            h3_elements = soup.find_all('h3')
            
            if not h3_elements:
                # Fallback: parse entire content as a single update
                items.append({
                    "id": entry_id,
                    "date": date_str,
                    "updated": updated,
                    "link": link,
                    "type": "General",
                    "content": content_html.strip()
                })
            else:
                current_type = None
                current_html_parts = []
                
                # We traverse children to group them under their respective h3 header
                for child in soup.children:
                    if child.name == 'h3':
                        if current_type and current_html_parts:
                            items.append({
                                "id": f"{entry_id}#{current_type.lower()}-{len(items)}",
                                "date": date_str,
                                "updated": updated,
                                "link": link,
                                "type": current_type,
                                "content": "".join(str(c) for c in current_html_parts).strip()
                            })
                        current_type = child.get_text().strip()
                        current_html_parts = []
                    else:
                        if child.name is not None or str(child).strip():
                            current_html_parts.append(child)
                
                # Append last item
                if current_type and current_html_parts:
                    items.append({
                        "id": f"{entry_id}#{current_type.lower()}-{len(items)}",
                        "date": date_str,
                        "updated": updated,
                        "link": link,
                        "type": current_type,
                        "content": "".join(str(c) for c in current_html_parts).strip()
                    })
        
        return items, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    # Fetch fresh data
    items, error = parse_release_notes()
    if error:
        return jsonify({"success": False, "error": error}), 500
    
    return jsonify({"success": True, "releases": items})

if __name__ == '__main__':
    # Running locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)

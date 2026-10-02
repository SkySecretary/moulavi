import re

filepath = "/Users/awadnejil/Desktop/moulavi-erp/b2c/src/App.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Match the loop start and the opening attributes of the div
pattern = r"\{\s*hotels\.filter\([^)]+\)\.map\(\(h\)\s*=>\s*\(\s*key=\{h\.id\}\s*className=\{`option-item \$\{selectedMadinahHotelId === h\.id \? 'selected' : ''\}`\}\s*onClick=\{\(\)\s*=>\s*setSelectedMadinahHotelId\(h\.id\)\}\s*>"

match = re.search(pattern, content)
if match:
    matched_str = match.group(0)
    print("Found match!")
    # Replace it with the correct div syntax
    replacement = "{\n                              hotels.filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina')).map((h) => (\n                                <div \n                                  key={h.id}\n                                  className={`option-item ${selectedMadinahHotelId === h.id ? 'selected' : ''}`}\n                                  onClick={() => setSelectedMadinahHotelId(h.id)}\n                                >"
    
    # We can also do a direct text block replacement if we find the exact text
    content_new = content[:match.start()] + replacement + content[match.end():]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content_new)
    print("✅ Successfully fixed JSX syntax error via regex!")
else:
    # Let's do a simple string replace of the exact lines
    old_block = "                              {hotels.filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina')).map((h) => (\n                                key={h.id}\n                                className={`option-item ${selectedMadinahHotelId === h.id ? 'selected' : ''}`}\n                                onClick={() => setSelectedMadinahHotelId(h.id)}\n                              >"
    
    new_block = "                              {hotels.filter(h => h.city?.toLowerCase().includes('madinah') || h.name?.toLowerCase().includes('madinah') || h.city?.toLowerCase().includes('medina')).map((h) => (\n                                <div \n                                  key={h.id}\n                                  className={`option-item ${selectedMadinahHotelId === h.id ? 'selected' : ''}`}\n                                  onClick={() => setSelectedMadinahHotelId(h.id)}\n                                >"
    
    if old_block in content:
        content_new = content.replace(old_block, new_block)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content_new)
        print("✅ Successfully fixed JSX syntax error via block replace!")
    else:
        # Let's find the map line and replace it and the next 4 lines
        lines = content.splitlines()
        found = False
        for i, line in enumerate(lines):
            if "Madinah Hotel Allotments" in line:
                # Find the map line in the next few lines
                for j in range(i, i+15):
                    if "hotels.filter" in lines[j] and "includes('madinah')" in lines[j]:
                        print(f"Replacing at line {j+1}")
                        lines[j+1] = "                                <div"
                        lines[j+2] = "                                  key={h.id}"
                        lines[j+3] = "                                  className={`option-item ${selectedMadinahHotelId === h.id ? 'selected' : ''}`}"
                        lines[j+4] = "                                  onClick={() => setSelectedMadinahHotelId(h.id)}"
                        lines[j+5] = "                                >"
                        found = True
                        break
            if found:
                break
        
        if found:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")
            print("✅ Successfully fixed JSX syntax error via index replace!")
        else:
            print("❌ Failure: Could not locate loop structure.")

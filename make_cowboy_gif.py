from pathlib import Path
from PIL import Image

source = Path(r"C:\Users\Fernando\.codex\generated_images\01a0341d-3637-7993-8207-8733dffb4825\exec-f0323fad-34d7-4da8-807a-6ff139675342.png")
output = Path(r"C:\Users\Fernando\Documents\ChatGPT\Rode IO\cowboy_laco_galope.gif")

sheet = Image.open(source).convert("RGB")
cols, rows = 4, 2
cell_w, cell_h = sheet.width // cols, sheet.height // rows
frames = []

for row in range(rows):
    for col in range(cols):
        frame = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        frame = frame.resize((512, 680), Image.Resampling.LANCZOS)
        frames.append(frame)

# Hold the first and last poses slightly less to keep the loop energetic.
frames[0].save(
    output,
    save_all=True,
    append_images=frames[1:],
    duration=95,
    loop=0,
    optimize=True,
)
print(output)

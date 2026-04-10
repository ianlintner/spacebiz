---
applyTo: '**/concepts/**,**/assets/**,**/*.png,**/*.jpg'
---
# Image Generation MCP Server

This project has a local image-gen-mcp server configured at `.mcp/image-gen-mcp/`.

## When to Use
- Generating game art concepts, sprites, portraits, or UI assets
- Creating or editing images for `public/concepts/` directories
- Producing advisor portraits, ship sprites, planet art, or UI elements

## MCP Server Details
- **VS Code config**: `.vscode/mcp.json` (server name: `image-gen-mcp`)
- **Transport**: STDIO via `start-mcp.sh`
- **Default model**: `gpt-image-1.5` (OpenAI)

## Available Tools
| Tool | Purpose |
|------|---------|
| `generate_image` | Create new images from text prompts |
| `edit_image` | Modify existing images |
| `list_available_models` | Show configured providers/models |
| `health_check` | Verify server is running |
| `server_info` | Server metadata |

## generate_image Parameters
- `prompt` (required): Detailed description of the image
- `size`: `1024x1024`, `1536x1024`, or `1024x1536`
- `quality`: `auto`, `high`, `medium`, `low`
- `style`: `vivid` or `natural`
- `output_format`: `png` (default), `jpg`, `webp`
- `background`: `transparent` or `opaque`
- `moderation`: `auto` (default)

## Art Direction for Star Freight Tycoon
When generating game assets, use prompts that include:
- **Style**: Clean modern game art with pixel-art influences, sci-fi aesthetic
- **Lighting**: Teal and amber rim lighting, high contrast
- **Background**: Transparent for sprites and portraits
- **Mood**: Space station / deep space / trading post atmosphere
- **Format**: PNG at 1024x1024 for portraits, 1536x1024 for scenes

## Output Locations
- Advisor portraits → `public/concepts/assistant/`
- Alien art → `public/concepts/aliens/`
- Hero/splash art → `public/concepts/hero/`
- Audio visualizations → `public/concepts/audio/`
- Pixel portraits → `public/concepts/pixel-portraits/`

## Gotchas
- Image generation takes 60-120 seconds per image
- STDIO transport returns `file://` URLs — copy files to `public/concepts/`
- The `.env` file at `.mcp/image-gen-mcp/.env` contains the API key (gitignored)
- Server must be restarted if the API key changes

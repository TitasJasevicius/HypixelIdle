using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HypixelidleBackEnd.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SkinController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public SkinController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        [AllowAnonymous]
        [Route("Resolve")]
        public async Task<ActionResult<SkinResolveResponse>> Resolve([FromQuery] string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return BadRequest("Username is required.");
            }

            var client = _httpClientFactory.CreateClient();
            var normalizedUsername = username.Trim();

            var mojangResponse = await client.GetAsync($"https://api.mojang.com/users/profiles/minecraft/{Uri.EscapeDataString(normalizedUsername)}");

            if (!mojangResponse.IsSuccessStatusCode)
            {
                return NotFound("Username was not found.");
            }

            var profileContent = await mojangResponse.Content.ReadAsStringAsync();
            using var profileJson = JsonDocument.Parse(profileContent);

            if (!profileJson.RootElement.TryGetProperty("id", out var idElement))
            {
                return NotFound("Could not resolve UUID for username.");
            }

            var uuid = idElement.GetString();
            if (string.IsNullOrWhiteSpace(uuid))
            {
                return NotFound("Resolved UUID was empty.");
            }

            var sessionJson = await GetSessionJson(client, uuid);
            if (sessionJson == null)
            {
                return NotFound("Could not resolve session textures for UUID.");
            }

            var texturesProperty = sessionJson.RootElement
                .GetProperty("properties")
                .EnumerateArray()
                .FirstOrDefault(property =>
                    property.TryGetProperty("name", out var nameElement)
                    && string.Equals(nameElement.GetString(), "textures", StringComparison.Ordinal));

            if (texturesProperty.ValueKind == JsonValueKind.Undefined
                || !texturesProperty.TryGetProperty("value", out var valueElement))
            {
                return NotFound("Textures payload was missing.");
            }

            var texturesBase64 = valueElement.GetString();
            if (string.IsNullOrWhiteSpace(texturesBase64))
            {
                return NotFound("Textures payload value was empty.");
            }

            var decodedTextures = DecodeTexturesPayload(texturesBase64);
            if (decodedTextures == null)
            {
                return NotFound("Failed to decode textures payload.");
            }

            var skinUrl = GetTextureUrl(decodedTextures.RootElement, "SKIN");
            var capeUrl = GetTextureUrl(decodedTextures.RootElement, "CAPE");

            if (string.IsNullOrWhiteSpace(skinUrl))
            {
                return NotFound("Skin URL was missing from textures payload.");
            }

            return Ok(new SkinResolveResponse
            {
                Username = normalizedUsername,
                Uuid = uuid,
                SkinUrl = skinUrl,
                CapeUrl = capeUrl
            });
        }

        private static async Task<JsonDocument?> GetSessionJson(HttpClient client, string uuid)
        {
            var sources = new[]
            {
                $"https://mowojang.matdoes.dev/session/minecraft/profile/{uuid}",
                $"https://sessionserver.mojang.com/session/minecraft/profile/{uuid}"
            };

            foreach (var source in sources)
            {
                var response = await client.GetAsync(source);
                if (!response.IsSuccessStatusCode)
                {
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                try
                {
                    return JsonDocument.Parse(content);
                }
                catch
                {
                    // 
                }
            }

            return null;
        }

        private static JsonDocument? DecodeTexturesPayload(string base64Value)
        {
            try
            {
                var jsonBytes = Convert.FromBase64String(base64Value);
                var json = Encoding.UTF8.GetString(jsonBytes);
                return JsonDocument.Parse(json);
            }
            catch
            {
                return null;
            }
        }

        private static string? GetTextureUrl(JsonElement root, string textureKey)
        {
            if (!root.TryGetProperty("textures", out var textures)
                || !textures.TryGetProperty(textureKey, out var texture)
                || !texture.TryGetProperty("url", out var urlElement))
            {
                return null;
            }

            var url = urlElement.GetString();
            if (string.IsNullOrWhiteSpace(url))
            {
                return null;
            }

            return url.Replace("http://", "https://", StringComparison.OrdinalIgnoreCase);
        }

        public sealed class SkinResolveResponse
        {
            public string Username { get; set; } = string.Empty;

            public string Uuid { get; set; } = string.Empty;

            public string SkinUrl { get; set; } = string.Empty;

            public string? CapeUrl { get; set; }
        }
    }

}


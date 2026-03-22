using System;
using System.Security.Claims;
using System.Text;
using HypixelidleBackEnd.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace HypixelidleBackEnd.Services;

public sealed class TokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(Player player, out DateTime expiresAtUtc)
    {
        var key = _configuration["Jwt:Key"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("JWT signing key is not configured (Jwt:Key).");
        }

        if (!int.TryParse(_configuration["Jwt:ExpireMinutes"], out var accessMinutes))
        {
            accessMinutes = 30;
        }

        expiresAtUtc = DateTime.UtcNow.AddMinutes(accessMinutes);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, player.IdPlayer.ToString()),
            new(ClaimTypes.Name, player.Username)
        };

        if (!string.IsNullOrWhiteSpace(player.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, player.Email));
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

using HypixelidleBackEnd.Models;
using HypixelidleBackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HypixelidleBackEnd.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly HypixelIdleContext _context;
    private readonly HashingService _hashingService;
    private readonly TokenService _tokenService;

    public AuthController(HypixelIdleContext context, HashingService hashingService, TokenService tokenService)
    {
        _context = context;
        _hashingService = hashingService;
        _tokenService = tokenService;
    }

    [AllowAnonymous]
    [HttpPost("Login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Username and password are required.");
        }

        var passwordHash = _hashingService.HashPassword(request.Password);
        var player = await _context.Players
            .FirstOrDefaultAsync(p => p.Username == request.Username && p.Password == passwordHash);

        if (player is null)
        {
            return Unauthorized("Invalid username or password.");
        }

        var accessToken = _tokenService.GenerateAccessToken(player, out var accessTokenExpiresAtUtc);

        return Ok(new AuthResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAtUtc = accessTokenExpiresAtUtc
        });
    }

    public sealed class LoginRequest
    {
        public string Username { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }

    public sealed class AuthResponse
    {
        public string AccessToken { get; set; } = string.Empty;

        public DateTime AccessTokenExpiresAtUtc { get; set; }
    }
}

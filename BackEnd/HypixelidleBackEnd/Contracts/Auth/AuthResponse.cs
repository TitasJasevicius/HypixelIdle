namespace HypixelidleBackEnd.Contracts.Auth;

public sealed class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;

    public DateTime AccessTokenExpiresAtUtc { get; set; }
}

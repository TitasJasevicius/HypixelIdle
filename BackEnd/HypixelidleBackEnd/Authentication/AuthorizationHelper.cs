using System.Security.Claims;

namespace HypixelidleBackEnd.Authentication;

public static class AuthorizationHelper
{
    public static bool IsAuthorizedForPlayer(ClaimsPrincipal user, int playerId)
    {
        if (IsAdmin(user))
        {
            return true;
        }

        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userIdClaim))
            return false;

        return userIdClaim == playerId.ToString();
    }

    public static bool IsAdmin(ClaimsPrincipal user)
    {
        return string.Equals(user.FindFirstValue("AdminBypass"), "true", StringComparison.OrdinalIgnoreCase)
            || string.Equals(user.FindFirstValue(ClaimTypes.Role), "Admin", StringComparison.OrdinalIgnoreCase)
            || user.FindFirstValue(ClaimTypes.NameIdentifier) == "-1";
    }
}

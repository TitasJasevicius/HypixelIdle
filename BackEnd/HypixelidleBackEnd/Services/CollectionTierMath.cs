using HypixelidleBackEnd.Models;

namespace HypixelidleBackEnd.Services
{
    public static class CollectionTierMath
    {
        public static int GetRequiredItemsValue(int baseRequiredItemsValue, int tierNumber, int fallbackRequiredItemsValue)
        {
            if (tierNumber <= 0)
            {
                return Math.Max(1, fallbackRequiredItemsValue);
            }

            if (tierNumber < 50)
            {
                var calculatedValue = baseRequiredItemsValue * Math.Pow(tierNumber, 1.15) * Math.Pow(1.18, tierNumber);
                return Math.Max(1, (int)Math.Ceiling(calculatedValue));
            }

            return Math.Max(1, fallbackRequiredItemsValue);
        }

        public static List<ResolvedCollectionTier> ResolveTiers(IReadOnlyList<Collectiontier> tiers)
        {
            var resolvedTiers = new List<ResolvedCollectionTier>();

            if (tiers.Count == 0)
            {
                return resolvedTiers;
            }

            var tierDefinition = tiers
                .OrderByDescending(currentTier => currentTier.MaxTier)
                .ThenBy(currentTier => currentTier.RequiredItemsValue)
                .First();

            var maxTier = Math.Max(1, tierDefinition.MaxTier);
            var baseRequiredItemsValue = Math.Max(1, tierDefinition.RequiredItemsValue);

            for (var tierNumber = 1; tierNumber <= maxTier; tierNumber++)
            {
                var resolvedRequiredItemsValue = GetRequiredItemsValue(baseRequiredItemsValue, tierNumber, tierDefinition.RequiredItemsValue);

                resolvedTiers.Add(new ResolvedCollectionTier(
                    tierDefinition,
                    tierNumber,
                    resolvedRequiredItemsValue));
            }

            return resolvedTiers;
        }
    }

    public sealed record ResolvedCollectionTier(Collectiontier Tier, int TierNumber, int RequiredItemsValue);
}
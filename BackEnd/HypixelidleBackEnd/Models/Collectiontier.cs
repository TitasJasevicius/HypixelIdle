using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Collectiontier
{
    public string Name { get; set; } = null!;

    public int RequiredItemsValue { get; set; }

    public int RewardSkyblockXp { get; set; }

    public float? RewardXp { get; set; }

    public int MaxTier { get; set; }

    public int IdCollectionTiers { get; set; }

    public int FkItemidItem { get; set; }

    public int FkCollectionidCollection { get; set; }

    public virtual Collection FkCollectionidCollectionNavigation { get; set; } = null!;

    public virtual Item FkItemidItemNavigation { get; set; } = null!;
}

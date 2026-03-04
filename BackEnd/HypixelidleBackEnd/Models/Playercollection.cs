using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playercollection
{
    public int TotalCollected { get; set; }

    public bool Unlocked { get; set; }

    public int CurrentTier { get; set; }

    public int IdPlayerCollections { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public int FkCollectionidCollection { get; set; }

    public virtual Collection FkCollectionidCollectionNavigation { get; set; } = null!;

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}

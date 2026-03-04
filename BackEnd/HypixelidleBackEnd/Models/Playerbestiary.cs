using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playerbestiary
{
    public int Kills { get; set; }

    public int CurrentTier { get; set; }

    public int MaxTier { get; set; }

    public int IdPlayerBestiary { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public int FkBestiaryidBestiary { get; set; }

    public virtual Bestiary FkBestiaryidBestiaryNavigation { get; set; } = null!;

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}

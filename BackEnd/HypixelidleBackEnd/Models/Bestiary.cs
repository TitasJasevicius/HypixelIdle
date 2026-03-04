using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Bestiary
{
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? Icon { get; set; }

    public int IdBestiary { get; set; }

    public int FkMobidMob { get; set; }

    public virtual ICollection<Bestiarytier> Bestiarytiers { get; set; } = new List<Bestiarytier>();

    public virtual Mob FkMobidMobNavigation { get; set; } = null!;

    public virtual ICollection<Playerbestiary> Playerbestiaries { get; set; } = new List<Playerbestiary>();
}

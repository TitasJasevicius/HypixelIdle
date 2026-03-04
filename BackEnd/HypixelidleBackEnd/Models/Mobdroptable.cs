using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Mobdroptable
{
    public float DropChance { get; set; }

    public int MinQuantity { get; set; }

    public int MaxQuantity { get; set; }

    public int IdMobDropTable { get; set; }

    public int FkItemidItem { get; set; }

    public virtual Item FkItemidItemNavigation { get; set; } = null!;

    public virtual ICollection<Mob> FkMobidMobs { get; set; } = new List<Mob>();
}

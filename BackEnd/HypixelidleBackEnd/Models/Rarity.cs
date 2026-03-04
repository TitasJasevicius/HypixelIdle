using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Rarity
{
    public int IdRarities { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();

    public virtual ICollection<Seacreaturemob> Seacreaturemobs { get; set; } = new List<Seacreaturemob>();
}

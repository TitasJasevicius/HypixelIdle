using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playersack
{
    public int MaxTotalSacks { get; set; }

    public int IdPlayerSacks { get; set; }

    public int FkSackTypesidSackTypes { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;

    public virtual Sacktype FkSackTypesidSackTypesNavigation { get; set; } = null!;

    public virtual ICollection<Playersackitem> Playersackitems { get; set; } = new List<Playersackitem>();
}

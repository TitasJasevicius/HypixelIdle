using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playersackitem
{
    public int Quantity { get; set; }

    public int IdPlayerSackItems { get; set; }

    public int FkPlayerSacksidPlayerSacks { get; set; }

    public int FkItemidItem { get; set; }

    public virtual Item FkItemidItemNavigation { get; set; } = null!;

    public virtual Playersack FkPlayerSacksidPlayerSacksNavigation { get; set; } = null!;
}

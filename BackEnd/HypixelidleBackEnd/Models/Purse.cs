using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Purse
{
    public float Balance { get; set; }

    public int Bits { get; set; }

    public int IdPurse { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}

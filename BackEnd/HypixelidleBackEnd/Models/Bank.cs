using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Bank
{
    public float Balance { get; set; }

    public int IdBank { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}

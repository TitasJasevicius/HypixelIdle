using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Playercontract
{
    public int IdPlayerContracts { get; set; }

    public int FkPlayeridPlayer { get; set; }

    public int FkContractidContract { get; set; }

    public int ProgressCount { get; set; }

    public virtual Contract FkContractidContractNavigation { get; set; } = null!;

    public virtual Player FkPlayeridPlayerNavigation { get; set; } = null!;
}
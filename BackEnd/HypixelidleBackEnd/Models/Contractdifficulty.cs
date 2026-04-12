using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Contractdifficulty
{
    public int IdContractDifficulty { get; set; }

    public string Value { get; set; } = null!;

    public virtual ICollection<Contract> Contracts { get; set; } = new List<Contract>();
}
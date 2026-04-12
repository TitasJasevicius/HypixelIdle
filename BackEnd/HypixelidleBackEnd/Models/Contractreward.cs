using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Contractreward
{
    public int IdContractReward { get; set; }

    public int? FkItemidItem { get; set; }

    public float Chance { get; set; }

    public int? XpReward { get; set; }

    public int? CoinReward { get; set; }

    public int ContractPoints { get; set; }

    public virtual Item? FkItemidItemNavigation { get; set; }

    public virtual ICollection<ContractContractreward> ContractContractrewards { get; set; } = new List<ContractContractreward>();
}
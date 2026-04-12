using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class ContractContractreward
{
    public int FkContractidContract { get; set; }

    public int FkContractRewardidContractReward { get; set; }

    public virtual Contract FkContractidContractNavigation { get; set; } = null!;

    public virtual Contractreward FkContractRewardidContractRewardNavigation { get; set; } = null!;
}
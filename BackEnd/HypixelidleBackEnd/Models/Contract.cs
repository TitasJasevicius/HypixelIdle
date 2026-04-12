using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Contract
{
    public int IdContract { get; set; }

    public string ContractName { get; set; } = null!;

    public int FkContractdifficultyidContractdifficulty { get; set; }

    public int TargetCount { get; set; }

    public int FkSkillsidSkills { get; set; }

    public int? FkMobidMob { get; set; }

    public int? FkNodeidNode { get; set; }

    public virtual Mob? FkMobidMobNavigation { get; set; }

    public virtual Node? FkNodeidNodeNavigation { get; set; }

    public virtual Contractdifficulty FkContractdifficultyidContractdifficultyNavigation { get; set; } = null!;

    public virtual Skill FkSkillsidSkillsNavigation { get; set; } = null!;

    public virtual ICollection<ContractContractreward> ContractContractrewards { get; set; } = new List<ContractContractreward>();

    public virtual ICollection<Playercontract> Playercontracts { get; set; } = new List<Playercontract>();
}
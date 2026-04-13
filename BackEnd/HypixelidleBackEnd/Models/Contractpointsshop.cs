using System;
using System.Collections.Generic;

namespace HypixelidleBackEnd.Models;

public partial class Contractpointsshop
{
    public int IdContractPointsShop { get; set; }

    public int FkItemidItem { get; set; }

    public int Price { get; set; }

    public int? FkCollectionidCollection { get; set; }

    public int? RequiredCollectionTier { get; set; }

    public int? FkSkillsidSkills { get; set; }

    public int? SkillLevel { get; set; }

    public int Quantity { get; set; }

    public DateTime? StartAt { get; set; }

    public DateTime? EndAt { get; set; }

    public virtual Collection? FkCollectionidCollectionNavigation { get; set; }

    public virtual Item FkItemidItemNavigation { get; set; } = null!;

    public virtual Skill? FkSkillsidSkillsNavigation { get; set; }
}
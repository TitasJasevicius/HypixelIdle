using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace HypixelidleBackEnd.Models;

public partial class HypixelIdleContext : DbContext
{
    public HypixelIdleContext()
    {
    }

    public HypixelIdleContext(DbContextOptions<HypixelIdleContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Accessorybagslot> Accessorybagslots { get; set; }

    public virtual DbSet<Bank> Banks { get; set; }

    public virtual DbSet<Bestiary> Bestiaries { get; set; }

    public virtual DbSet<Bestiarytier> Bestiarytiers { get; set; }

    public virtual DbSet<Collection> Collections { get; set; }

    public virtual DbSet<Collectiontier> Collectiontiers { get; set; }

    public virtual DbSet<Contract> Contracts { get; set; }

    public virtual DbSet<ContractContractreward> ContractContractrewards { get; set; }

    public virtual DbSet<Contractdifficulty> Contractdifficulties { get; set; }

    public virtual DbSet<Contractreward> Contractrewards { get; set; }

    public virtual DbSet<Entitystat> Entitystats { get; set; }

    public virtual DbSet<Equipmenttype> Equipmenttypes { get; set; }

    public virtual DbSet<Fishingtype> Fishingtypes { get; set; }

    public virtual DbSet<Gardenlevel> Gardenlevels { get; set; }

    public virtual DbSet<Gardenplant> Gardenplants { get; set; }

    public virtual DbSet<Item> Items { get; set; }

    public virtual DbSet<Iteminstance> Iteminstances { get; set; }

    public virtual DbSet<Mob> Mobs { get; set; }

    public virtual DbSet<Mobdroptable> Mobdroptables { get; set; }

    public virtual DbSet<Mobinstance> Mobinstances { get; set; }

    public virtual DbSet<Node> Nodes { get; set; }

    public virtual DbSet<Nodetype> Nodetypes { get; set; }

    public virtual DbSet<Player> Players { get; set; }

    public virtual DbSet<Playeraccesorybag> Playeraccesorybags { get; set; }

    public virtual DbSet<PlayerActivities> Playeractivities { get; set; }

    public virtual DbSet<Playeractivity> Playeractivities1 { get; set; }

    public virtual DbSet<Playerbestiary> Playerbestiaries { get; set; }

    public virtual DbSet<Playercollection> Playercollections { get; set; }

    public virtual DbSet<Playercontract> Playercontracts { get; set; }

    public virtual DbSet<Playerequipment> Playerequipments { get; set; }

    public virtual DbSet<Playergardenplot> Playergardenplots { get; set; }

    public virtual DbSet<Playerinventoryslot> Playerinventoryslots { get; set; }

    public virtual DbSet<Playersack> Playersacks { get; set; }

    public virtual DbSet<Playersackitem> Playersackitems { get; set; }

    public virtual DbSet<Playerskill> Playerskills { get; set; }

    public virtual DbSet<Playerstoragepage> Playerstoragepages { get; set; }

    public virtual DbSet<Playerstorageslot> Playerstorageslots { get; set; }

    public virtual DbSet<Playernodeunlock> Playernodeunlocks { get; set; }

    public virtual DbSet<Purse> Purses { get; set; }

    public virtual DbSet<Rarity> Rarities { get; set; }

    public virtual DbSet<Recipe> Recipes { get; set; }

    public virtual DbSet<Sacktier> Sacktiers { get; set; }

    public virtual DbSet<Sacktype> Sacktypes { get; set; }

    public virtual DbSet<Sacktypealloweditem> Sacktypealloweditems { get; set; }

    public virtual DbSet<Seacreaturemob> Seacreaturemobs { get; set; }

    public virtual DbSet<Skill> Skills { get; set; }

    public virtual DbSet<Skillcategory> Skillcategories { get; set; }

    public virtual DbSet<Skillxptype> Skillxptypes { get; set; }

    public virtual DbSet<Stat> Stats { get; set; }

    public virtual DbSet<Tier> Tiers { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseMySql("server=localhost;port=3306;database=hypixelidle;user=root", Microsoft.EntityFrameworkCore.ServerVersion.Parse("10.6.20-mariadb"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_general_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Accessorybagslot>(entity =>
        {
            entity.HasKey(e => e.IdAccessoryBagSlots).HasName("PRIMARY");

            entity.ToTable("accessorybagslots");

            entity.HasIndex(e => e.FkPlayerAccesoryBagidPlayerAccesoryBag, "fk_PlayerAccesoryBagid_PlayerAccesoryBag");

            entity.Property(e => e.IdAccessoryBagSlots)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_AccessoryBagSlots");
            entity.Property(e => e.FkPlayerAccesoryBagidPlayerAccesoryBag)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerAccesoryBagid_PlayerAccesoryBag");
            entity.Property(e => e.SlotIndex)
                .HasColumnType("int(11)")
                .HasColumnName("slotIndex");

            entity.HasOne(d => d.FkPlayerAccesoryBagidPlayerAccesoryBagNavigation).WithMany(p => p.Accessorybagslots)
                .HasForeignKey(d => d.FkPlayerAccesoryBagidPlayerAccesoryBag)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("accessorybagslots_ibfk_1");
        });

        modelBuilder.Entity<Bank>(entity =>
        {
            entity.HasKey(e => e.IdBank).HasName("PRIMARY");

            entity.ToTable("bank");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player").IsUnique();

            entity.Property(e => e.IdBank)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Bank");
            entity.Property(e => e.Balance).HasColumnName("balance");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithOne(p => p.Bank)
                .HasForeignKey<Bank>(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bank_ibfk_1");
        });

        modelBuilder.Entity<Bestiary>(entity =>
        {
            entity.HasKey(e => e.IdBestiary).HasName("PRIMARY");

            entity.ToTable("bestiary");

            entity.HasIndex(e => e.FkMobidMob, "fk_Mobid_Mob").IsUnique();

            entity.Property(e => e.IdBestiary)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Bestiary");
            entity.Property(e => e.Description)
                .HasMaxLength(100)
                .HasColumnName("description");
            entity.Property(e => e.FkMobidMob)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Mobid_Mob");
            entity.Property(e => e.Icon)
                .HasMaxLength(100)
                .HasColumnName("icon");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");

            entity.HasOne(d => d.FkMobidMobNavigation).WithOne(p => p.Bestiary)
                .HasForeignKey<Bestiary>(d => d.FkMobidMob)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bestiary_ibfk_1");
        });

        modelBuilder.Entity<Bestiarytier>(entity =>
        {
            entity.HasKey(e => e.IdBestiaryTiers).HasName("PRIMARY");

            entity.ToTable("bestiarytiers");

            entity.HasIndex(e => e.FkBestiaryidBestiary, "fk_Bestiaryid_Bestiary");

            entity.Property(e => e.IdBestiaryTiers)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_BestiaryTiers");
            entity.Property(e => e.FkBestiaryidBestiary)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Bestiaryid_Bestiary");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.RequiredKills)
                .HasColumnType("int(11)")
                .HasColumnName("requiredKills");
            entity.Property(e => e.RewardSkyblockXp)
                .HasColumnType("int(11)")
                .HasColumnName("rewardSkyblockXp");
            entity.Property(e => e.RewardXp).HasColumnName("rewardXp");
            entity.Property(e => e.Tier)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("tier");

            entity.HasOne(d => d.FkBestiaryidBestiaryNavigation).WithMany(p => p.Bestiarytiers)
                .HasForeignKey(d => d.FkBestiaryidBestiary)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bestiarytiers_ibfk_1");
        });

        modelBuilder.Entity<Collection>(entity =>
        {
            entity.HasKey(e => e.IdCollection).HasName("PRIMARY");

            entity.ToTable("collection");

            entity.Property(e => e.IdCollection)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Collection");
            entity.Property(e => e.Description)
                .HasMaxLength(100)
                .HasColumnName("description");
            entity.Property(e => e.Icon)
                .HasMaxLength(100)
                .HasColumnName("icon");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Collectiontier>(entity =>
        {
            entity.HasKey(e => e.IdCollectionTiers).HasName("PRIMARY");

            entity.ToTable("collectiontiers");

            entity.HasIndex(e => e.FkCollectionidCollection, "fk_Collectionid_Collection");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item").IsUnique();

            entity.Property(e => e.IdCollectionTiers)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_CollectionTiers");
            entity.Property(e => e.FkCollectionidCollection)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Collectionid_Collection");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.MaxTier)
                .HasColumnType("int(11)")
                .HasColumnName("maxTier");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.RequiredItemsValue)
                .HasColumnType("int(11)")
                .HasColumnName("requiredItemsValue");
            entity.Property(e => e.RewardSkyblockXp)
                .HasColumnType("int(11)")
                .HasColumnName("rewardSkyblockXp");
            entity.Property(e => e.RewardXp).HasColumnName("rewardXp");

            entity.HasOne(d => d.FkCollectionidCollectionNavigation).WithMany(p => p.Collectiontiers)
                .HasForeignKey(d => d.FkCollectionidCollection)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("collectiontiers_ibfk_2");

            entity.HasOne(d => d.FkItemidItemNavigation).WithOne(p => p.Collectiontier)
                .HasForeignKey<Collectiontier>(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("collectiontiers_ibfk_1");
        });

        modelBuilder.Entity<Contract>(entity =>
        {
            entity.HasKey(e => e.IdContract).HasName("PRIMARY");

            entity.ToTable("contract");

            entity.HasIndex(e => e.FkContractdifficultyidContractdifficulty, "fk_ContractDifficultyid_ContractDifficulty");

            entity.HasIndex(e => e.FkMobidMob, "fk_Mobid_Mob");

            entity.HasIndex(e => e.FkNodeidNode, "fk_Nodeid_Node");

            entity.HasIndex(e => e.FkSkillsidSkills, "fk_Skillsid_Skills");

            entity.Property(e => e.IdContract)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_Contract");
            entity.Property(e => e.ContractName)
                .HasMaxLength(100)
                .HasColumnName("contractName");
            entity.Property(e => e.FkContractdifficultyidContractdifficulty)
                .HasColumnType("int(11)")
                .HasColumnName("fk_ContractDifficultyid_ContractDifficulty");
            entity.Property(e => e.FkMobidMob)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Mobid_Mob");
            entity.Property(e => e.FkNodeidNode)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Nodeid_Node");
            entity.Property(e => e.FkSkillsidSkills)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Skillsid_Skills");
            entity.Property(e => e.TargetCount)
                .HasColumnType("int(11)")
                .HasColumnName("targetCount");

            entity.HasOne(d => d.FkMobidMobNavigation).WithMany()
                .HasForeignKey(d => d.FkMobidMob)
                .HasConstraintName("contract_ibfk_2");

            entity.HasOne(d => d.FkContractdifficultyidContractdifficultyNavigation).WithMany(p => p.Contracts)
                .HasForeignKey(d => d.FkContractdifficultyidContractdifficulty)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("contract_ibfk_4");

            entity.HasOne(d => d.FkNodeidNodeNavigation).WithMany()
                .HasForeignKey(d => d.FkNodeidNode)
                .HasConstraintName("contract_ibfk_3");

            entity.HasOne(d => d.FkSkillsidSkillsNavigation).WithMany()
                .HasForeignKey(d => d.FkSkillsidSkills)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("contract_ibfk_1");
        });

        modelBuilder.Entity<Contractdifficulty>(entity =>
        {
            entity.HasKey(e => e.IdContractDifficulty).HasName("PRIMARY");

            entity.ToTable("contractdifficulty");

            entity.Property(e => e.IdContractDifficulty)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_ContractDifficulty");
            entity.Property(e => e.Value)
                .HasMaxLength(50)
                .HasColumnName("value");
        });

        modelBuilder.Entity<ContractContractreward>(entity =>
        {
            entity.HasKey(e => new { e.FkContractidContract, e.FkContractRewardidContractReward })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("contract_contractreward");

            entity.HasIndex(e => e.FkContractRewardidContractReward, "fk_ContractRewardid_ContractReward");

            entity.Property(e => e.FkContractidContract)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Contractid_Contract");
            entity.Property(e => e.FkContractRewardidContractReward)
                .HasColumnType("int(11)")
                .HasColumnName("fk_ContractRewardid_ContractReward");

            entity.HasOne(d => d.FkContractidContractNavigation).WithMany(p => p.ContractContractrewards)
                .HasForeignKey(d => d.FkContractidContract)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("contract_contractreward_ibfk_1");

            entity.HasOne(d => d.FkContractRewardidContractRewardNavigation).WithMany(p => p.ContractContractrewards)
                .HasForeignKey(d => d.FkContractRewardidContractReward)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("contract_contractreward_ibfk_2");
        });

        modelBuilder.Entity<Contractreward>(entity =>
        {
            entity.HasKey(e => e.IdContractReward).HasName("PRIMARY");

            entity.ToTable("contractreward");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.Property(e => e.IdContractReward)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_ContractReward");
            entity.Property(e => e.Chance).HasColumnName("chance");
            entity.Property(e => e.CoinReward)
                .HasColumnType("int(11)")
                .HasColumnName("coinReward");
            entity.Property(e => e.ContractPoints)
                .HasColumnType("int(11)")
                .HasColumnName("contractPoints");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.XpReward)
                .HasColumnType("int(11)")
                .HasColumnName("xpReward");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany()
                .HasForeignKey(d => d.FkItemidItem)
                .HasConstraintName("contractreward_ibfk_1");
        });

        modelBuilder.Entity<Entitystat>(entity =>
        {
            entity.HasKey(e => e.IdEntityStats).HasName("PRIMARY");

            entity.ToTable("entitystats");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkMobidMob, "fk_Mobid_Mob");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.HasIndex(e => e.FkStatsidStats, "fk_Statsid_Stats");

            entity.Property(e => e.IdEntityStats)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_EntityStats");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.FkMobidMob)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Mobid_Mob");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkStatsidStats)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Statsid_Stats");
            entity.Property(e => e.PercentageValue).HasColumnName("percentageValue");
            entity.Property(e => e.Value)
                .HasColumnType("int(11)")
                .HasColumnName("value");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Entitystats)
                .HasForeignKey(d => d.FkItemidItem)
                .HasConstraintName("entitystats_ibfk_3");

            entity.HasOne(d => d.FkMobidMobNavigation).WithMany(p => p.Entitystats)
                .HasForeignKey(d => d.FkMobidMob)
                .HasConstraintName("entitystats_ibfk_4");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Entitystats)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .HasConstraintName("entitystats_ibfk_1");

            entity.HasOne(d => d.FkStatsidStatsNavigation).WithMany(p => p.Entitystats)
                .HasForeignKey(d => d.FkStatsidStats)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("entitystats_ibfk_2");
        });

        modelBuilder.Entity<Equipmenttype>(entity =>
        {
            entity.HasKey(e => e.IdEquipmentTypes).HasName("PRIMARY");

            entity.ToTable("equipmenttypes");

            entity.Property(e => e.IdEquipmentTypes)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_EquipmentTypes");
            entity.Property(e => e.Name)
                .HasMaxLength(10)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Fishingtype>(entity =>
        {
            entity.HasKey(e => e.IdFishingTypes).HasName("PRIMARY");

            entity.ToTable("fishingtypes");

            entity.Property(e => e.IdFishingTypes)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_FishingTypes");
            entity.Property(e => e.Name)
                .HasMaxLength(5)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Gardenlevel>(entity =>
        {
            entity.HasKey(e => e.IdGardenLevels).HasName("PRIMARY");

            entity.ToTable("gardenlevels");

            entity.Property(e => e.IdGardenLevels)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_GardenLevels");
            entity.Property(e => e.BonusGrowthRate).HasColumnName("bonusGrowthRate");
            entity.Property(e => e.BonusYieldRate).HasColumnName("bonusYieldRate");
            entity.Property(e => e.MaxLevels)
                .HasColumnType("int(11)")
                .HasColumnName("maxLevels");
        });

        modelBuilder.Entity<Gardenplant>(entity =>
        {
            entity.HasKey(e => e.IdGardenPlants).HasName("PRIMARY");

            entity.ToTable("gardenplants");

            entity.HasIndex(e => e.FkPlayerGardenPlotsidPlayerGardenPlots, "fk_PlayerGardenPlotsid_PlayerGardenPlots");

            entity.Property(e => e.IdGardenPlants)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_GardenPlants");
            entity.Property(e => e.BaseGrowthTime)
                .HasColumnType("int(11)")
                .HasColumnName("baseGrowthTime");
            entity.Property(e => e.BaseYield)
                .HasColumnType("int(11)")
                .HasColumnName("baseYield");
            entity.Property(e => e.Category)
                .HasMaxLength(100)
                .HasColumnName("category");
            entity.Property(e => e.FkPlayerGardenPlotsidPlayerGardenPlots)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerGardenPlotsid_PlayerGardenPlots");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.XpPerHarvest)
                .HasDefaultValueSql("'1'")
                .HasColumnName("xpPerHarvest");

            entity.HasOne(d => d.FkPlayerGardenPlotsidPlayerGardenPlotsNavigation).WithMany(p => p.Gardenplants)
                .HasForeignKey(d => d.FkPlayerGardenPlotsidPlayerGardenPlots)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("gardenplants_ibfk_1");
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(e => e.IdItem).HasName("PRIMARY");

            entity.ToTable("item");

            entity.HasIndex(e => e.FkCollectionidCollection, "fk_Collectionid_Collection").IsUnique();

            entity.HasIndex(e => e.Rarity, "rarity");

            entity.Property(e => e.IdItem)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Item");
            entity.Property(e => e.Category)
                .HasMaxLength(100)
                .HasColumnName("category");
            entity.Property(e => e.FkCollectionidCollection)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Collectionid_Collection");
            entity.Property(e => e.Icon)
                .HasMaxLength(100)
                .HasColumnName("icon");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Rarity)
                .HasColumnType("int(11)")
                .HasColumnName("rarity");
            entity.Property(e => e.SellValue)
                .HasColumnType("int(11)")
                .HasColumnName("sellValue");
            entity.Property(e => e.StackValue)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("stackValue");
            entity.Property(e => e.Stackable).HasColumnName("stackable");

            entity.HasOne(d => d.FkCollectionidCollectionNavigation).WithOne(p => p.Item)
                .HasForeignKey<Item>(d => d.FkCollectionidCollection)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("item_ibfk_2");

            entity.HasOne(d => d.RarityNavigation).WithMany(p => p.Items)
                .HasForeignKey(d => d.Rarity)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("item_ibfk_1");
        });

        modelBuilder.Entity<Iteminstance>(entity =>
        {
            entity.HasKey(e => e.IdItemInstance).HasName("PRIMARY");

            entity.ToTable("iteminstance");

            entity.HasIndex(e => e.FkAccessoryBagSlotsidAccessoryBagSlots, "fk_AccessoryBagSlotsid_AccessoryBagSlots").IsUnique();

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkPlayerEquipmentidPlayerEquipment, "fk_PlayerEquipmentid_PlayerEquipment").IsUnique();

            entity.HasIndex(e => e.FkPlayerInventorySlotsidPlayerInventorySlots, "fk_PlayerInventorySlotsid_PlayerInventorySlots").IsUnique();

            entity.HasIndex(e => e.FkPlayerStorageSlotsidPlayerStorageSlots, "fk_PlayerStorageSlotsid_PlayerStorageSlots").IsUnique();

            entity.Property(e => e.IdItemInstance)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_ItemInstance");
            entity.Property(e => e.BreakingPower)
                .HasColumnType("int(11)")
                .HasColumnName("breakingPower");
            entity.Property(e => e.CustomName)
                .HasMaxLength(255)
                .HasColumnName("customName");
            entity.Property(e => e.DungeonStars)
                .HasColumnType("int(11)")
                .HasColumnName("dungeonStars");
            entity.Property(e => e.EnchantmentsJson)
                .HasMaxLength(1000)
                .HasColumnName("enchantmentsJson");
            entity.Property(e => e.FkAccessoryBagSlotsidAccessoryBagSlots)
                .HasColumnType("int(11)")
                .HasColumnName("fk_AccessoryBagSlotsid_AccessoryBagSlots");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.FkPlayerEquipmentidPlayerEquipment)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerEquipmentid_PlayerEquipment");
            entity.Property(e => e.FkPlayerInventorySlotsidPlayerInventorySlots)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerInventorySlotsid_PlayerInventorySlots");
            entity.Property(e => e.FkPlayerStorageSlotsidPlayerStorageSlots)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerStorageSlotsid_PlayerStorageSlots");
            entity.Property(e => e.RarityOverride).HasColumnName("rarityOverride");
            entity.Property(e => e.Reforge)
                .HasMaxLength(100)
                .HasColumnName("reforge");
            entity.Property(e => e.UniqueId)
                .HasMaxLength(255)
                .HasColumnName("uniqueId");

            entity.HasOne(d => d.FkAccessoryBagSlotsidAccessoryBagSlotsNavigation).WithOne(p => p.Iteminstance)
                .HasForeignKey<Iteminstance>(d => d.FkAccessoryBagSlotsidAccessoryBagSlots)
                .HasConstraintName("iteminstance_ibfk_2");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Iteminstances)
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("iteminstance_ibfk_3");

            entity.HasOne(d => d.FkPlayerEquipmentidPlayerEquipmentNavigation).WithOne(p => p.Iteminstance)
                .HasForeignKey<Iteminstance>(d => d.FkPlayerEquipmentidPlayerEquipment)
                .HasConstraintName("iteminstance_ibfk_1");

            entity.HasOne(d => d.FkPlayerInventorySlotsidPlayerInventorySlotsNavigation).WithOne(p => p.Iteminstance)
                .HasForeignKey<Iteminstance>(d => d.FkPlayerInventorySlotsidPlayerInventorySlots)
                .HasConstraintName("iteminstance_ibfk_5");

            entity.HasOne(d => d.FkPlayerStorageSlotsidPlayerStorageSlotsNavigation).WithOne(p => p.Iteminstance)
                .HasForeignKey<Iteminstance>(d => d.FkPlayerStorageSlotsidPlayerStorageSlots)
                .HasConstraintName("iteminstance_ibfk_4");
        });

        modelBuilder.Entity<Mob>(entity =>
        {
            entity.HasKey(e => e.IdMob).HasName("PRIMARY");

            entity.ToTable("mob");

            entity.HasIndex(e => e.SkillXpType, "skillXpType");

            entity.Property(e => e.IdMob)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Mob");
            entity.Property(e => e.BaseDamage)
                .HasColumnType("int(11)")
                .HasColumnName("baseDamage");
            entity.Property(e => e.BaseHealth)
                .HasColumnType("int(11)")
                .HasColumnName("baseHealth");
            entity.Property(e => e.CoinsOnDeath)
                .HasColumnType("int(11)")
                .HasColumnName("coinsOnDeath");
            entity.Property(e => e.ExpOrbs)
                .HasColumnType("int(11)")
                .HasColumnName("expOrbs");
            entity.Property(e => e.Icon)
                .HasMaxLength(255)
                .HasColumnName("icon");
            entity.Property(e => e.Location)
                .HasMaxLength(100)
                .HasColumnName("location");
            entity.Property(e => e.MobType)
                .HasMaxLength(100)
                .HasColumnName("mobType");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.SkillXpAmount).HasColumnName("skillXpAmount");
            entity.Property(e => e.SkillXpType)
                .HasColumnType("int(11)")
                .HasColumnName("skillXpType");

            entity.HasOne(d => d.SkillXpTypeNavigation).WithMany(p => p.Mobs)
                .HasForeignKey(d => d.SkillXpType)
                .HasConstraintName("mob_ibfk_1");

            entity.HasMany(d => d.FkMobDropTableidMobDropTables).WithMany(p => p.FkMobidMobs)
                .UsingEntity<Dictionary<string, object>>(
                    "MobMobdroptable",
                    r => r.HasOne<Mobdroptable>().WithMany()
                        .HasForeignKey("FkMobDropTableidMobDropTable")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("mob_mobdroptable_ibfk_2"),
                    l => l.HasOne<Mob>().WithMany()
                        .HasForeignKey("FkMobidMob")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("mob_mobdroptable_ibfk_1"),
                    j =>
                    {
                        j.HasKey("FkMobidMob", "FkMobDropTableidMobDropTable")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("mob_mobdroptable");
                        j.HasIndex(new[] { "FkMobDropTableidMobDropTable" }, "fk_MobDropTableid_MobDropTable");
                        j.IndexerProperty<int>("FkMobidMob")
                            .HasColumnType("int(11)")
                            .HasColumnName("fk_Mobid_Mob");
                        j.IndexerProperty<int>("FkMobDropTableidMobDropTable")
                            .HasColumnType("int(11)")
                            .HasColumnName("fk_MobDropTableid_MobDropTable");
                    });
        });

        modelBuilder.Entity<Mobdroptable>(entity =>
        {
            entity.HasKey(e => e.IdMobDropTable).HasName("PRIMARY");

            entity.ToTable("mobdroptable");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.Property(e => e.IdMobDropTable)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_MobDropTable");
            entity.Property(e => e.DropChance).HasColumnName("dropChance");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.MaxQuantity)
                .HasColumnType("int(11)")
                .HasColumnName("maxQuantity");
            entity.Property(e => e.MinQuantity)
                .HasColumnType("int(11)")
                .HasColumnName("minQuantity");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Mobdroptables)
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("mobdroptable_ibfk_1");
        });

        modelBuilder.Entity<Mobinstance>(entity =>
        {
            entity.HasKey(e => e.IdMobInstance).HasName("PRIMARY");

            entity.ToTable("mobinstance");

            entity.HasIndex(e => e.FkMobidMob, "fk_Mobid_Mob");

            entity.Property(e => e.IdMobInstance)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_MobInstance");
            entity.Property(e => e.CurrentHealth)
                .HasColumnType("int(11)")
                .HasColumnName("currentHealth");
            entity.Property(e => e.FkMobidMob)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Mobid_Mob");
            entity.Property(e => e.LastUpdate)
                .HasColumnType("datetime")
                .HasColumnName("lastUpdate");
            entity.Property(e => e.SpawnedDate)
                .HasColumnType("datetime")
                .HasColumnName("spawnedDate");

            entity.HasOne(d => d.FkMobidMobNavigation).WithMany(p => p.Mobinstances)
                .HasForeignKey(d => d.FkMobidMob)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("mobinstance_ibfk_1");
        });

        modelBuilder.Entity<Node>(entity =>
        {
            entity.HasKey(e => e.IdNode).HasName("PRIMARY");

            entity.ToTable("node");

            entity.HasIndex(e => e.FkNodeitemidItem, "idx_node_item");

            entity.HasIndex(e => e.FkNodetypeidNodeType, "idx_node_type");

            entity.HasIndex(e => e.FkOutputitemidItem, "idx_node_output");

            entity.Property(e => e.IdNode)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_Node");
            entity.Property(e => e.BaseYieldQty)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("baseYieldQty");
            entity.Property(e => e.FkNodeitemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Nodeitemid_Item");
            entity.Property(e => e.FkNodetypeidNodeType)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Nodetypeid_NodeType");
            entity.Property(e => e.FkOutputitemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Outputitemid_Item");
            entity.Property(e => e.IsEnabled).HasColumnName("isEnabled");
            entity.Property(e => e.NodeHealth)
                .HasDefaultValueSql("'10'")
                .HasColumnType("int(11)")
                .HasColumnName("nodeHealth");
            entity.Property(e => e.RequiredLevel)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("requiredLevel");
            entity.Property(e => e.RequiredToolType)
                .HasMaxLength(32)
                .HasColumnName("requiredToolType");
            entity.Property(e => e.RespawnMs)
                .HasDefaultValueSql("'3000'")
                .HasColumnType("int(11)")
                .HasColumnName("respawnMs");
            entity.Property(e => e.UnlockPrice)
                .HasColumnType("int(11)")
                .HasColumnName("unlockPrice");
            entity.Property(e => e.XpReward)
                .HasColumnType("int(11)")
                .HasColumnName("xpReward");
            entity.Property(e => e.Zone)
                .HasMaxLength(64)
                .HasColumnName("zone");

            entity.HasOne(d => d.FkNodeitemidItemNavigation).WithMany(p => p.NodeFkNodeitemidItemNavigations)
                .HasForeignKey(d => d.FkNodeitemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_node_item");

            entity.HasOne(d => d.FkNodetypeidNodeTypeNavigation).WithMany(p => p.Nodes)
                .HasForeignKey(d => d.FkNodetypeidNodeType)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_node_type");

            entity.HasOne(d => d.FkOutputitemidItemNavigation).WithMany(p => p.NodeFkOutputitemidItemNavigations)
                .HasForeignKey(d => d.FkOutputitemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_node_output");
        });

        modelBuilder.Entity<Playernodeunlock>(entity =>
        {
            entity.HasKey(e => new { e.FkPlayeridPlayer, e.FkNodeidNode }).HasName("PRIMARY");

            entity.ToTable("playernodeunlocks");

            entity.HasIndex(e => e.FkNodeidNode, "fk_Nodeid_Node");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkNodeidNode)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Nodeid_Node");

            entity.HasOne(d => d.FkNodeidNodeNavigation).WithMany(p => p.Playernodeunlocks)
                .HasForeignKey(d => d.FkNodeidNode)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playernodeunlocks_ibfk_2");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playernodeunlocks)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playernodeunlocks_ibfk_1");
        });

        modelBuilder.Entity<Nodetype>(entity =>
        {
            entity.HasKey(e => e.IdNodeType).HasName("PRIMARY");

            entity.ToTable("node_type");

            entity.HasIndex(e => e.Name, "uq_node_type_name").IsUnique();

            entity.Property(e => e.IdNodeType)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_NodeType");
            entity.Property(e => e.IsEnabled).HasColumnName("isEnabled");
            entity.Property(e => e.Name)
                .HasMaxLength(32)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Player>(entity =>
        {
            entity.HasKey(e => e.IdPlayer).HasName("PRIMARY");

            entity.ToTable("player");

            entity.Property(e => e.IdPlayer)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_Player");
            entity.Property(e => e.CurrentXp)
                .HasColumnType("int(11)")
                .HasColumnName("currentXp");
            entity.Property(e => e.ContractPoints)
                .HasColumnType("int(11)")
                .HasColumnName("contractPoints");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.EnchantingLvl).HasColumnName("enchantingLvl");
            entity.Property(e => e.GardenXp)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("gardenXp");
            entity.Property(e => e.Password)
                .HasMaxLength(255)
                .HasColumnName("password");
            entity.Property(e => e.SkyblockLevel)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("skyblockLevel");
            entity.Property(e => e.Username)
                .HasMaxLength(100)
                .HasColumnName("username");
        });

        modelBuilder.Entity<Playeraccesorybag>(entity =>
        {
            entity.HasKey(e => e.IdPlayerAccesoryBag).HasName("PRIMARY");

            entity.ToTable("playeraccesorybag");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player").IsUnique();

            entity.Property(e => e.IdPlayerAccesoryBag)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerAccesoryBag");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.MagicPower)
                .HasColumnType("int(11)")
                .HasColumnName("magicPower");
            entity.Property(e => e.UnlockedSlots)
                .HasColumnType("int(11)")
                .HasColumnName("unlockedSlots");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithOne(p => p.Playeraccesorybag)
                .HasForeignKey<Playeraccesorybag>(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playeraccesorybag_ibfk_1");
        });

        modelBuilder.Entity<PlayerActivities>(entity =>
        {
            entity.HasKey(e => e.IdPlayerActivities).HasName("PRIMARY");

            entity.ToTable("playeractivities");

            entity.Property(e => e.IdPlayerActivities)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerActivities");
            entity.Property(e => e.Name)
                .HasMaxLength(10)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Playeractivity>(entity =>
        {
            entity.HasKey(e => e.IdPlayerActivity).HasName("PRIMARY");

            entity.ToTable("playeractivity");

            entity.HasIndex(e => e.ActivityType, "activityType");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player").IsUnique();

            entity.Property(e => e.IdPlayerActivity)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerActivity");
            entity.Property(e => e.ActivityType)
                .HasColumnType("int(11)")
                .HasColumnName("activityType");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("isActive");
            entity.Property(e => e.LastProcessedAt)
                .HasColumnType("datetime")
                .HasColumnName("lastProcessedAt");
            entity.Property(e => e.StartedAt)
                .HasColumnType("datetime")
                .HasColumnName("startedAt");
            entity.Property(e => e.TargetId)
                .HasColumnType("int(11)")
                .HasColumnName("targetId");
            entity.Property(e => e.TargetType)
                .HasMaxLength(100)
                .HasColumnName("targetType");

            entity.HasOne(d => d.ActivityTypeNavigation).WithMany(p => p.Playeractivities)
                .HasForeignKey(d => d.ActivityType)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playeractivity_ibfk_1");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithOne(p => p.Playeractivity)
                .HasForeignKey<Playeractivity>(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playeractivity_ibfk_2");
        });

        modelBuilder.Entity<Playerbestiary>(entity =>
        {
            entity.HasKey(e => e.IdPlayerBestiary).HasName("PRIMARY");

            entity.ToTable("playerbestiary");

            entity.HasIndex(e => e.FkBestiaryidBestiary, "fk_Bestiaryid_Bestiary");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.IdPlayerBestiary)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerBestiary");
            entity.Property(e => e.CurrentTier)
                .HasColumnType("int(11)")
                .HasColumnName("currentTier");
            entity.Property(e => e.FkBestiaryidBestiary)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Bestiaryid_Bestiary");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.Kills)
                .HasColumnType("int(11)")
                .HasColumnName("kills");
            entity.Property(e => e.MaxTier)
                .HasColumnType("int(11)")
                .HasColumnName("maxTier");

            entity.HasOne(d => d.FkBestiaryidBestiaryNavigation).WithMany(p => p.Playerbestiaries)
                .HasForeignKey(d => d.FkBestiaryidBestiary)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerbestiary_ibfk_2");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playerbestiaries)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerbestiary_ibfk_1");
        });

        modelBuilder.Entity<Playercollection>(entity =>
        {
            entity.HasKey(e => e.IdPlayerCollections).HasName("PRIMARY");

            entity.ToTable("playercollections");

            entity.HasIndex(e => e.FkCollectionidCollection, "fk_Collectionid_Collection");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.IdPlayerCollections)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerCollections");
            entity.Property(e => e.CurrentTier)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("currentTier");
            entity.Property(e => e.FkCollectionidCollection)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Collectionid_Collection");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.TotalCollected)
                .HasColumnType("int(11)")
                .HasColumnName("totalCollected");
            entity.Property(e => e.Unlocked).HasColumnName("unlocked");

            entity.HasOne(d => d.FkCollectionidCollectionNavigation).WithMany(p => p.Playercollections)
                .HasForeignKey(d => d.FkCollectionidCollection)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playercollections_ibfk_2");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playercollections)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playercollections_ibfk_1");
        });

        modelBuilder.Entity<Playercontract>(entity =>
        {
            entity.HasKey(e => e.IdPlayerContracts).HasName("PRIMARY");

            entity.ToTable("playercontracts");

            entity.HasIndex(e => e.FkContractidContract, "fk_Contractid_Contract");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.HasIndex(e => new { e.FkPlayeridPlayer, e.FkContractidContract }, "uq_player_contract").IsUnique();

            entity.Property(e => e.IdPlayerContracts)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerContracts");
            entity.Property(e => e.FkContractidContract)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Contractid_Contract");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.ProgressCount)
                .HasDefaultValueSql("'0'")
                .HasColumnType("int(11)")
                .HasColumnName("progressCount");

            entity.HasOne(d => d.FkContractidContractNavigation).WithMany(p => p.Playercontracts)
                .HasForeignKey(d => d.FkContractidContract)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playercontracts_ibfk_2");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playercontracts)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playercontracts_ibfk_1");
        });

        modelBuilder.Entity<Playerequipment>(entity =>
        {
            entity.HasKey(e => e.IdPlayerEquipment).HasName("PRIMARY");

            entity.ToTable("playerequipment");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");
            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.HasIndex(e => e.Slot, "slot");

            entity.Property(e => e.IdPlayerEquipment)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerEquipment");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.Slot)
                .HasColumnType("int(11)")
                .HasColumnName("slot");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany()
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("playerequipment_ibfk_item");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playerequipments)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerequipment_ibfk_2");

            entity.HasOne(d => d.SlotNavigation).WithMany(p => p.Playerequipments)
                .HasForeignKey(d => d.Slot)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerequipment_ibfk_1");
        });

        modelBuilder.Entity<Playergardenplot>(entity =>
        {
            entity.HasKey(e => e.IdPlayerGardenPlots).HasName("PRIMARY");

            entity.ToTable("playergardenplots");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.IdPlayerGardenPlots)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerGardenPlots");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.LastHarvestedDate)
                .HasColumnType("datetime")
                .HasColumnName("lastHarvestedDate");
            entity.Property(e => e.PlantDate)
                .HasColumnType("datetime")
                .HasColumnName("plantDate");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playergardenplots)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playergardenplots_ibfk_1");
        });

        modelBuilder.Entity<Playerinventoryslot>(entity =>
        {
            entity.HasKey(e => e.IdPlayerInventorySlots).HasName("PRIMARY");

            entity.ToTable("playerinventoryslots");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.IdPlayerInventorySlots)
                .ValueGeneratedOnAdd()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerInventorySlots");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.Quantity)
                .HasColumnType("int(11)")
                .HasColumnName("quantity");
            entity.Property(e => e.SlotIndex)
                .HasColumnType("int(11)")
                .HasColumnName("slotIndex");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playerinventoryslots)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerinventoryslots_ibfk_1");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Playerinventoryslots)
                .HasForeignKey(d => d.FkItemidItem)
                .HasConstraintName("playerinventoryslots_ibfk_item");
        });

        modelBuilder.Entity<Playersack>(entity =>
        {
            entity.HasKey(e => e.IdPlayerSacks).HasName("PRIMARY");

            entity.ToTable("playersacks");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.HasIndex(e => e.FkSackTypesidSackTypes, "fk_SackTypesid_SackTypes");

            entity.Property(e => e.IdPlayerSacks)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerSacks");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkSackTypesidSackTypes)
                .HasColumnType("int(11)")
                .HasColumnName("fk_SackTypesid_SackTypes");
            entity.Property(e => e.MaxTotalSacks)
                .HasColumnType("int(11)")
                .HasColumnName("maxTotalSacks");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playersacks)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playersacks_ibfk_2");

            entity.HasOne(d => d.FkSackTypesidSackTypesNavigation).WithMany(p => p.Playersacks)
                .HasForeignKey(d => d.FkSackTypesidSackTypes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playersacks_ibfk_1");
        });

        modelBuilder.Entity<Playersackitem>(entity =>
        {
            entity.HasKey(e => e.IdPlayerSackItems).HasName("PRIMARY");

            entity.ToTable("playersackitems");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkPlayerSacksidPlayerSacks, "fk_PlayerSacksid_PlayerSacks");

            entity.Property(e => e.IdPlayerSackItems)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerSackItems");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.FkPlayerSacksidPlayerSacks)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerSacksid_PlayerSacks");
            entity.Property(e => e.Quantity)
                .HasColumnType("int(11)")
                .HasColumnName("quantity");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Playersackitems)
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playersackitems_ibfk_2");

            entity.HasOne(d => d.FkPlayerSacksidPlayerSacksNavigation).WithMany(p => p.Playersackitems)
                .HasForeignKey(d => d.FkPlayerSacksidPlayerSacks)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playersackitems_ibfk_1");
        });

        modelBuilder.Entity<Playerskill>(entity =>
        {
            entity.HasKey(e => e.IdPlayerSkills).HasName("PRIMARY");

            entity.ToTable("playerskills");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.HasIndex(e => e.FkSkillsidSkills, "members");

            entity.Property(e => e.IdPlayerSkills)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerSkills");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.FkSkillsidSkills)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Skillsid_Skills");
            entity.Property(e => e.Level)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("level");
            entity.Property(e => e.Xp)
                .HasDefaultValueSql("'1'")
                .HasColumnName("xp");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playerskills)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerskills_ibfk_1");

            entity.HasOne(d => d.FkSkillsidSkillsNavigation).WithMany(p => p.Playerskills)
                .HasForeignKey(d => d.FkSkillsidSkills)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("members");
        });

        modelBuilder.Entity<Playerstoragepage>(entity =>
        {
            entity.HasKey(e => e.IdPlayerStoragePages).HasName("PRIMARY");

            entity.ToTable("playerstoragepages");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player");

            entity.Property(e => e.IdPlayerStoragePages)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerStoragePages");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");
            entity.Property(e => e.PageNumber)
                .HasColumnType("int(11)")
                .HasColumnName("pageNumber");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithMany(p => p.Playerstoragepages)
                .HasForeignKey(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerstoragepages_ibfk_1");
        });

        modelBuilder.Entity<Playerstorageslot>(entity =>
        {
            entity.HasKey(e => e.IdPlayerStorageSlots).HasName("PRIMARY");

            entity.ToTable("playerstorageslots");

            entity.HasIndex(e => e.FkPlayerStoragePagesidPlayerStoragePages, "fk_PlayerStoragePagesid_PlayerStoragePages");

            entity.Property(e => e.IdPlayerStorageSlots)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_PlayerStorageSlots");
            entity.Property(e => e.FkPlayerStoragePagesidPlayerStoragePages)
                .HasColumnType("int(11)")
                .HasColumnName("fk_PlayerStoragePagesid_PlayerStoragePages");
            entity.Property(e => e.Quantity)
                .HasColumnType("int(11)")
                .HasColumnName("quantity");
            entity.Property(e => e.SlotIndex)
                .HasColumnType("int(11)")
                .HasColumnName("slotIndex");

            entity.HasOne(d => d.FkPlayerStoragePagesidPlayerStoragePagesNavigation).WithMany(p => p.Playerstorageslots)
                .HasForeignKey(d => d.FkPlayerStoragePagesidPlayerStoragePages)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("playerstorageslots_ibfk_1");
        });

        modelBuilder.Entity<Purse>(entity =>
        {
            entity.HasKey(e => e.IdPurse).HasName("PRIMARY");

            entity.ToTable("purse");

            entity.HasIndex(e => e.FkPlayeridPlayer, "fk_Playerid_Player").IsUnique();

            entity.Property(e => e.IdPurse)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Purse");
            entity.Property(e => e.Balance).HasColumnName("balance");
            entity.Property(e => e.Bits)
                .HasColumnType("int(11)")
                .HasColumnName("bits");
            entity.Property(e => e.FkPlayeridPlayer)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Playerid_Player");

            entity.HasOne(d => d.FkPlayeridPlayerNavigation).WithOne(p => p.Purse)
                .HasForeignKey<Purse>(d => d.FkPlayeridPlayer)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("purse_ibfk_1");
        });

        modelBuilder.Entity<Rarity>(entity =>
        {
            entity.HasKey(e => e.IdRarities).HasName("PRIMARY");

            entity.ToTable("rarities");

            entity.Property(e => e.IdRarities)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Rarities");
            entity.Property(e => e.Name)
                .HasMaxLength(11)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.HasKey(e => e.IdRecipes).HasName("PRIMARY");

            entity.ToTable("recipes");

            entity.HasIndex(e => e.FkCollectionidCollection, "fk_Collectionid_Collection");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkSkillsidSkills, "fk_Skillsid_Skills");

            entity.Property(e => e.IdRecipes)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Recipes");
            entity.Property(e => e.FkCollectionidCollection)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Collectionid_Collection");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.FkSkillsidSkills)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Skillsid_Skills");
            entity.Property(e => e.GridJson)
                .HasMaxLength(1000)
                .HasColumnName("gridJson");
            entity.Property(e => e.IsEnabled)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("isEnabled");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.RequiresCollectionTier)
                .HasColumnType("int(11)")
                .HasColumnName("requiresCollectionTier");
            entity.Property(e => e.RequiresSkillLevel)
                .HasColumnType("int(11)")
                .HasColumnName("requiresSkillLevel");
            entity.Property(e => e.ResultQuantity)
                .HasDefaultValueSql("'1'")
                .HasColumnType("int(11)")
                .HasColumnName("resultQuantity");

            entity.HasOne(d => d.FkCollectionidCollectionNavigation).WithMany(p => p.Recipes)
                .HasForeignKey(d => d.FkCollectionidCollection)
                .HasConstraintName("recipes_ibfk_1");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Recipes)
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("recipes_ibfk_3");

            entity.HasOne(d => d.FkSkillsidSkillsNavigation).WithMany(p => p.Recipes)
                .HasForeignKey(d => d.FkSkillsidSkills)
                .HasConstraintName("recipes_ibfk_2");
        });

        modelBuilder.Entity<Sacktier>(entity =>
        {
            entity.HasKey(e => e.IdSackTiers).HasName("PRIMARY");

            entity.ToTable("sacktiers");

            entity.HasIndex(e => e.FkSackTypesidSackTypes, "fk_SackTypesid_SackTypes");

            entity.HasIndex(e => e.Tier, "tier");

            entity.Property(e => e.IdSackTiers)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_SackTiers");
            entity.Property(e => e.CapacityPerItem)
                .HasColumnType("int(11)")
                .HasColumnName("capacityPerItem");
            entity.Property(e => e.FkSackTypesidSackTypes)
                .HasColumnType("int(11)")
                .HasColumnName("fk_SackTypesid_SackTypes");
            entity.Property(e => e.Tier)
                .HasColumnType("int(11)")
                .HasColumnName("tier");

            entity.HasOne(d => d.FkSackTypesidSackTypesNavigation).WithMany(p => p.Sacktiers)
                .HasForeignKey(d => d.FkSackTypesidSackTypes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("sacktiers_ibfk_2");

            entity.HasOne(d => d.TierNavigation).WithMany(p => p.Sacktiers)
                .HasForeignKey(d => d.Tier)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("sacktiers_ibfk_1");
        });

        modelBuilder.Entity<Sacktype>(entity =>
        {
            entity.HasKey(e => e.IdSackTypes).HasName("PRIMARY");

            entity.ToTable("sacktypes");

            entity.Property(e => e.IdSackTypes)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_SackTypes");
            entity.Property(e => e.Description)
                .HasMaxLength(100)
                .HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Sacktypealloweditem>(entity =>
        {
            entity.HasKey(e => e.IdSackTypeAllowedItems).HasName("PRIMARY");

            entity.ToTable("sacktypealloweditems");

            entity.HasIndex(e => e.FkItemidItem, "fk_Itemid_Item");

            entity.HasIndex(e => e.FkSackTypesidSackTypes, "fk_SackTypesid_SackTypes");

            entity.Property(e => e.IdSackTypeAllowedItems)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_SackTypeAllowedItems");
            entity.Property(e => e.FkItemidItem)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Itemid_Item");
            entity.Property(e => e.FkSackTypesidSackTypes)
                .HasColumnType("int(11)")
                .HasColumnName("fk_SackTypesid_SackTypes");

            entity.HasOne(d => d.FkItemidItemNavigation).WithMany(p => p.Sacktypealloweditems)
                .HasForeignKey(d => d.FkItemidItem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("sacktypealloweditems_ibfk_1");

            entity.HasOne(d => d.FkSackTypesidSackTypesNavigation).WithMany(p => p.Sacktypealloweditems)
                .HasForeignKey(d => d.FkSackTypesidSackTypes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("sacktypealloweditems_ibfk_2");
        });

        modelBuilder.Entity<Seacreaturemob>(entity =>
        {
            entity.HasKey(e => e.IdMob).HasName("PRIMARY");

            entity.ToTable("seacreaturemob");

            entity.HasIndex(e => e.FishingType, "fishingType");

            entity.HasIndex(e => e.Rarity, "rarity");

            entity.Property(e => e.IdMob)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Mob");
            entity.Property(e => e.DayMob)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("dayMob");
            entity.Property(e => e.FishingRequirement)
                .HasColumnType("int(11)")
                .HasColumnName("fishingRequirement");
            entity.Property(e => e.FishingType)
                .HasColumnType("int(11)")
                .HasColumnName("fishingType");
            entity.Property(e => e.Rarity)
                .HasColumnType("int(11)")
                .HasColumnName("rarity");
            entity.Property(e => e.SpawnMessage)
                .HasMaxLength(100)
                .HasColumnName("spawnMessage");
            entity.Property(e => e.Weight)
                .HasColumnType("int(11)")
                .HasColumnName("weight");

            entity.HasOne(d => d.FishingTypeNavigation).WithMany(p => p.Seacreaturemobs)
                .HasForeignKey(d => d.FishingType)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("seacreaturemob_ibfk_2");

            entity.HasOne(d => d.IdMobNavigation).WithOne(p => p.Seacreaturemob)
                .HasForeignKey<Seacreaturemob>(d => d.IdMob)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("seacreaturemob_ibfk_3");

            entity.HasOne(d => d.RarityNavigation).WithMany(p => p.Seacreaturemobs)
                .HasForeignKey(d => d.Rarity)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("seacreaturemob_ibfk_1");
        });

        modelBuilder.Entity<Skill>(entity =>
        {
            entity.HasKey(e => e.IdSkills).HasName("PRIMARY");

            entity.ToTable("skills");

            entity.HasIndex(e => e.Category, "category");

            entity.HasIndex(e => e.FkStatsidStats, "fk_Statsid_Stats").IsUnique();

            entity.Property(e => e.IdSkills)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Skills");
            entity.Property(e => e.BasePassiveAbilityValue).HasColumnName("basePassiveAbilityValue");
            entity.Property(e => e.Category)
                .HasColumnType("int(11)")
                .HasColumnName("category");
            entity.Property(e => e.Description)
                .HasMaxLength(256)
                .HasColumnName("description");
            entity.Property(e => e.FkStatsidStats)
                .HasColumnType("int(11)")
                .HasColumnName("fk_Statsid_Stats");
            entity.Property(e => e.MaxLevel)
                .HasColumnType("int(11)")
                .HasColumnName("maxLevel");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.PassiveAbility)
                .HasMaxLength(256)
                .HasColumnName("passiveAbility");

            entity.HasOne(d => d.CategoryNavigation).WithMany(p => p.Skills)
                .HasForeignKey(d => d.Category)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("skills_ibfk_1");

            entity.HasOne(d => d.FkStatsidStatsNavigation).WithOne(p => p.Skill)
                .HasForeignKey<Skill>(d => d.FkStatsidStats)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("skills_ibfk_2");
        });

        modelBuilder.Entity<Skillcategory>(entity =>
        {
            entity.HasKey(e => e.IdSkillCategories).HasName("PRIMARY");

            entity.ToTable("skillcategories");

            entity.Property(e => e.IdSkillCategories)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_SkillCategories");
            entity.Property(e => e.Name)
                .HasMaxLength(13)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Skillxptype>(entity =>
        {
            entity.HasKey(e => e.IdSkillXpTypes).HasName("PRIMARY");

            entity.ToTable("skillxptypes");

            entity.Property(e => e.IdSkillXpTypes)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_SkillXpTypes");
            entity.Property(e => e.Name)
                .HasMaxLength(7)
                .IsFixedLength()
                .HasColumnName("name");
        });

        modelBuilder.Entity<Stat>(entity =>
        {
            entity.HasKey(e => e.IdStats).HasName("PRIMARY");

            entity.ToTable("stats");

            entity.Property(e => e.IdStats)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Stats");
            entity.Property(e => e.Category)
                .HasMaxLength(100)
                .HasColumnName("category");
            entity.Property(e => e.Effect)
                .HasMaxLength(256)
                .HasColumnName("effect");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Tier>(entity =>
        {
            entity.HasKey(e => e.IdTier).HasName("PRIMARY");

            entity.ToTable("tier");

            entity.Property(e => e.IdTier)
                .ValueGeneratedNever()
                .HasColumnType("int(11)")
                .HasColumnName("id_Tier");
            entity.Property(e => e.Name)
                .HasMaxLength(6)
                .IsFixedLength()
                .HasColumnName("name");
        });

        foreach (var foreignKey in modelBuilder.Model
                     .GetEntityTypes()
                     .SelectMany(entityType => entityType.GetForeignKeys())
                     .Where(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Player)))
        {
            foreignKey.DeleteBehavior = DeleteBehavior.Cascade;
        }

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

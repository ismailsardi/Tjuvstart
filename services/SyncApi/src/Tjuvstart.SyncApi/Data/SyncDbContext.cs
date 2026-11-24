using Microsoft.EntityFrameworkCore;

namespace Tjuvstart.SyncApi.Data;

public sealed class SyncDbContext(DbContextOptions<SyncDbContext> options) : DbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();

    public DbSet<ExternalIdentity> ExternalIdentities => Set<ExternalIdentity>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<SyncRecord> SyncRecords => Set<SyncRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(account =>
        {
            account.ToTable("accounts");
            account.Property(a => a.Id).HasColumnName("id");
            account.Property(a => a.CreatedAt).HasColumnName("created_at");
            account.Property(a => a.LastSeenAt).HasColumnName("last_seen_at");
            account.Property(a => a.SyncSequence).HasColumnName("sync_sequence");

            // Deleting an account removes everything that belongs to it (ADR 0011).
            account.HasMany(a => a.Identities)
                .WithOne()
                .HasForeignKey(i => i.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            account.HasMany<RefreshToken>()
                .WithOne()
                .HasForeignKey(t => t.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            account.HasMany<SyncRecord>()
                .WithOne()
                .HasForeignKey(r => r.AccountId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExternalIdentity>(identity =>
        {
            identity.ToTable("external_identities");
            identity.Property(i => i.Id).HasColumnName("id");
            identity.Property(i => i.AccountId).HasColumnName("account_id");
            identity.Property(i => i.Provider).HasColumnName("provider").HasMaxLength(ExternalIdentity.ProviderMaxLength);
            identity.Property(i => i.Subject).HasColumnName("subject").HasMaxLength(ExternalIdentity.SubjectMaxLength);
            identity.Property(i => i.Email).HasColumnName("email").HasMaxLength(ExternalIdentity.EmailMaxLength);
            identity.Property(i => i.CreatedAt).HasColumnName("created_at");

            identity.HasIndex(i => new { i.Provider, i.Subject }).IsUnique();
            identity.HasIndex(i => new { i.AccountId, i.Provider }).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(token =>
        {
            token.ToTable("refresh_tokens");
            token.Property(t => t.Id).HasColumnName("id");
            token.Property(t => t.AccountId).HasColumnName("account_id");
            token.Property(t => t.FamilyId).HasColumnName("family_id");
            token.Property(t => t.TokenHash).HasColumnName("token_hash").HasMaxLength(32);
            token.Property(t => t.CreatedAt).HasColumnName("created_at");
            token.Property(t => t.ExpiresAt).HasColumnName("expires_at");
            token.Property(t => t.UsedAt).HasColumnName("used_at");
            token.Property(t => t.RevokedAt).HasColumnName("revoked_at");

            token.HasIndex(t => t.TokenHash).IsUnique();
            token.HasIndex(t => t.FamilyId);
        });

        modelBuilder.Entity<SyncRecord>(record =>
        {
            record.ToTable("sync_records");
            record.HasKey(r => new { r.AccountId, r.Collection, r.Key });
            record.Property(r => r.AccountId).HasColumnName("account_id");
            record.Property(r => r.Collection).HasColumnName("collection").HasMaxLength(32);
            record.Property(r => r.Key).HasColumnName("key").HasMaxLength(SyncRecord.KeyMaxLength);
            record.Property(r => r.Data).HasColumnName("data").HasColumnType("jsonb");
            record.Property(r => r.UpdatedAt).HasColumnName("updated_at");
            record.Property(r => r.Sequence).HasColumnName("sequence");

            // Pulls read "everything after sequence N" for one account.
            record.HasIndex(r => new { r.AccountId, r.Sequence });
        });
    }
}

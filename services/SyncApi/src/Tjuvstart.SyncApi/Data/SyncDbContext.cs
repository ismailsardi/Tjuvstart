using Microsoft.EntityFrameworkCore;

namespace Tjuvstart.SyncApi.Data;

public sealed class SyncDbContext(DbContextOptions<SyncDbContext> options) : DbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();

    public DbSet<ExternalIdentity> ExternalIdentities => Set<ExternalIdentity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Account>(account =>
        {
            account.ToTable("accounts");
            account.Property(a => a.Id).HasColumnName("id");
            account.Property(a => a.CreatedAt).HasColumnName("created_at");
            account.Property(a => a.LastSeenAt).HasColumnName("last_seen_at");

            // Deleting an account removes everything that belongs to it (ADR 0011).
            account.HasMany(a => a.Identities)
                .WithOne()
                .HasForeignKey(i => i.AccountId)
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
    }
}

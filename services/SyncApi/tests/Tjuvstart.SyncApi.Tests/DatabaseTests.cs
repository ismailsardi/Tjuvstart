using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tjuvstart.SyncApi.Data;

namespace Tjuvstart.SyncApi.Tests;

public sealed class DatabaseTests(PostgresFixture postgres) : ApiTest(postgres)
{
    private static readonly DateTimeOffset Now = new(2026, 11, 24, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Migrations_are_applied_on_startup()
    {
        await using var db = Factory.CreateDbContext();

        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        Assert.Contains("20261124005939_InitialAccounts", await db.Database.GetAppliedMigrationsAsync());
    }

    [Fact]
    public async Task An_account_is_stored_with_its_identities()
    {
        var account = NewAccount("google", "1234");
        await Factory.WithDbAsync(async db =>
        {
            db.Accounts.Add(account);
            await db.SaveChangesAsync();
        });

        await using var db = Factory.CreateDbContext();
        var stored = await db.Accounts.Include(a => a.Identities).SingleAsync(a => a.Id == account.Id);
        var identity = Assert.Single(stored.Identities);
        Assert.Equal(("google", "1234"), (identity.Provider, identity.Subject));
        Assert.Equal(Now, stored.CreatedAt);
    }

    [Fact]
    public async Task The_same_provider_identity_cannot_belong_to_two_accounts()
    {
        await using var db = Factory.CreateDbContext();
        db.Accounts.Add(NewAccount("apple", "000123.abc"));
        await db.SaveChangesAsync();

        db.Accounts.Add(NewAccount("apple", "000123.abc"));

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    [Fact]
    public async Task Deleting_an_account_deletes_its_identities()
    {
        var account = NewAccount("google", "1234");
        await using (var db = Factory.CreateDbContext())
        {
            db.Accounts.Add(account);
            await db.SaveChangesAsync();
        }

        await using (var db = Factory.CreateDbContext())
        {
            // Delete in SQL, without loading the identities, to prove the cascade is in the schema.
            await db.Accounts.Where(a => a.Id == account.Id).ExecuteDeleteAsync();
        }

        await using var check = Factory.CreateDbContext();
        Assert.False(await check.ExternalIdentities.AnyAsync());
    }

    private static Account NewAccount(string provider, string subject)
    {
        var account = new Account { CreatedAt = Now, LastSeenAt = Now };
        account.Identities.Add(new ExternalIdentity { Provider = provider, Subject = subject, CreatedAt = Now });
        return account;
    }
}

using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserID);
                entity.HasIndex(e => e.Username).IsUnique();
            });

            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.ID);
                entity.HasIndex(e => e.Token).IsUnique();
                entity.HasOne<User>()
                      .WithMany()
                      .HasForeignKey(e => e.UserID);
            });
        }
    }
}

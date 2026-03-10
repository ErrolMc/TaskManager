using Microsoft.EntityFrameworkCore;
using TaskManager.Backend.Models;

namespace TaskManager.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<Board> Boards { get; set; }
        public DbSet<BoardMember> BoardMembers { get; set; }
        public DbSet<ListColumn> ListColumns { get; set; }
        public DbSet<Card> Cards { get; set; }

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

            modelBuilder.Entity<Board>(entity =>
            {
                entity.HasKey(entity => entity.ID);
                entity.HasOne(e => e.Owner)
                      .WithMany()
                      .HasForeignKey(e => e.OwnerUserID)
                      .OnDelete(DeleteBehavior.NoAction);
            });

            modelBuilder.Entity<BoardMember>(entity =>
            {
                entity.HasKey(e => new { e.BoardID, e.UserID });
                entity.HasOne(e => e.User)
                      .WithMany(u => u.BoardMemberships)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.NoAction);
                entity.HasOne(e => e.Board)
                      .WithMany()
                      .HasForeignKey(e => e.BoardID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ListColumn>(entity =>
            {
                entity.HasKey(e => e.ColumnID);
                entity.HasOne<Board>()
                      .WithMany()
                      .HasForeignKey(e => e.BoardID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Card>(entity =>
            {
                entity.HasKey(e => e.CardID);
                entity.HasOne<ListColumn>()
                      .WithMany()
                      .HasForeignKey(e => e.ColumnID)
                      .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne<User>()
                      .WithMany()
                      .HasForeignKey(e => e.CreatedByUserID)
                      .OnDelete(DeleteBehavior.NoAction);
            });
        }
    }
}

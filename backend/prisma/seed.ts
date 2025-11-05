import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed roles
  const adminRoleId = '00000000-0000-0000-0000-000000000001';
  const authorRoleId = '00000000-0000-0000-0000-000000000002';

  const adminRole = await prisma.role.upsert({
    where: { id: adminRoleId },
    update: {},
    create: {
      id: adminRoleId,
      name: 'Admin',
      slug: 'admin',
      description: 'Administrator with full access'
    }
  });

  const authorRole = await prisma.role.upsert({
    where: { id: authorRoleId },
    update: {},
    create: {
      id: authorRoleId,
      name: 'Author',
      slug: 'author',
      description: 'Content author with create/edit permissions'
    }
  });

  console.log('✅ Roles seeded');

  // Seed permissions
  const permissions = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'Manage Users', slug: 'users:manage' },
    { id: '10000000-0000-0000-0000-000000000002', name: 'Manage Roles', slug: 'roles:manage' },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Create Posts', slug: 'posts:create' },
    { id: '10000000-0000-0000-0000-000000000004', name: 'Edit Posts', slug: 'posts:edit' },
    { id: '10000000-0000-0000-0000-000000000005', name: 'Delete Posts', slug: 'posts:delete' },
    { id: '10000000-0000-0000-0000-000000000006', name: 'Approve Posts', slug: 'posts:approve' },
    { id: '10000000-0000-0000-0000-000000000007', name: 'Manage Categories', slug: 'categories:manage' },
    { id: '10000000-0000-0000-0000-000000000008', name: 'Manage Files', slug: 'files:manage' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { id: perm.id },
      update: {},
      create: {
        id: perm.id,
        name: perm.name,
        slug: perm.slug,
        description: `${perm.name} permission`
      }
    });
  }

  console.log('✅ Permissions seeded');

  // Assign all permissions to admin role
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleId,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: perm.id
      }
    });
  }

  // Assign basic permissions to author role
  const authorPerms = permissions.filter(p =>
    p.slug.startsWith('posts:create') ||
    p.slug.startsWith('posts:edit') ||
    p.slug.startsWith('files:manage')
  );

  for (const perm of authorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: authorRoleId,
          permissionId: perm.id
        }
      },
      update: {},
      create: {
        id: uuidv4(),
        roleId: authorRoleId,
        permissionId: perm.id
      }
    });
  }

  console.log('✅ Role permissions seeded');

  // Create admin user
  const adminUserId = '20000000-0000-0000-0000-000000000001';
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { id: adminUserId },
    update: {},
    create: {
      id: adminUserId,
      username: 'admin',
      email: 'admin@example.com',
      password: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true
    }
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUserId,
        roleId: adminRoleId
      }
    },
    update: {},
    create: {
      id: uuidv4(),
      userId: adminUserId,
      roleId: adminRoleId
    }
  });

  console.log('✅ Admin user created');

  // Create test users
  const testUsers = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      username: 'testuser1',
      email: 'testuser1@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User One'
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      username: 'testuser2',
      email: 'testuser2@example.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User Two'
    }
  ];

  for (const testUser of testUsers) {
    const passwordHash = await bcrypt.hash(testUser.password, 10);
    
    await prisma.user.upsert({
      where: { id: testUser.id },
      update: {},
      create: {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        password: passwordHash,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        isActive: true,
        language: 'en'
      }
    });

    // Assign author role to test users
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: testUser.id,
          roleId: authorRoleId
        }
      },
      update: {},
      create: {
        id: uuidv4(),
        userId: testUser.id,
        roleId: authorRoleId
      }
    });
  }

  console.log('✅ Test users created');

  // Seed categories
  const categories = [
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Videos', slug: 'videos' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Audios', slug: 'audios' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Photos', slug: 'photos' },
    { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Infographics', slug: 'infographics' },
    { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Documents', slug: 'documents' },
    { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Other', slug: 'other' }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug
      }
    });
  }

  console.log('✅ Categories seeded');

  // Create Public folder
  const publicFolderId = uuidv4();
  const existingPublic = await prisma.folder.findFirst({
    where: { isPublic: true }
  });

  let pubId: string;
  if (!existingPublic) {
    const publicFolder = await prisma.folder.create({
      data: {
        id: publicFolderId,
        name: 'Public',
        isPublic: true,
        accessType: 'public'
      }
    });
    pubId = publicFolder.id;
    console.log('✅ Public folder created');
  } else {
    pubId = existingPublic.id;
    console.log('✅ Public folder already exists');
  }

  // Create public subfolders
  const hasChildren = await prisma.folder.findFirst({
    where: { parentId: pubId }
  });

  if (!hasChildren) {
    const subfolderNames = ['Images', 'Videos', 'Audios', 'Documents'];
    for (const name of subfolderNames) {
      await prisma.folder.create({
        data: {
          id: uuidv4(),
          name: name,
          parentId: pubId,
          isPublic: true,
          accessType: 'public'
        }
      });
    }
    console.log('✅ Public subfolders created');
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

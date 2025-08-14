const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting E-commerce Microservices...\n');

// Service configurations
const services = [
  {
    name: 'Auth Service',
    port: 3001,
    path: path.join(__dirname, '../auth-service'),
    color: '\x1b[31m' // Red
  },
  {
    name: 'Product Service',
    port: 3002,
    path: path.join(__dirname, '../product-service'),
    color: '\x1b[32m' // Green
  },
  {
    name: 'Frontend Service',
    port: 3000,
    path: path.join(__dirname, '../frontend-service'),
    color: '\x1b[34m' // Blue
  }
];

const processes = [];

// Function to start a service
const startService = (service) => {
  return new Promise((resolve, reject) => {
    console.log(`${service.color}[${service.name}]\x1b[0m Starting on port ${service.port}...`);
    
    const child = spawn('npm', ['start'], {
      cwd: service.path,
      stdio: 'pipe',
      shell: true
    });

    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`${service.color}[${service.name}]\x1b[0m ${output}`);
      }
    });

    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('ExperimentalWarning')) {
        console.error(`${service.color}[${service.name} ERROR]\x1b[0m ${output}`);
      }
    });

    child.on('close', (code) => {
      console.log(`${service.color}[${service.name}]\x1b[0m Process exited with code ${code}`);
    });

    child.on('error', (error) => {
      console.error(`${service.color}[${service.name} ERROR]\x1b[0m ${error.message}`);
      reject(error);
    });

    processes.push({ name: service.name, process: child });
    
    // Give the service time to start
    setTimeout(() => {
      resolve();
    }, 2000);
  });
};

// Start all services
const startAll = async () => {
  try {
    for (const service of services) {
      await startService(service);
    }

    console.log('\n✅ All services started successfully!\n');
    console.log('🌐 Access the application:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Auth API: http://localhost:3001/health');
    console.log('   Product API: http://localhost:3002/health');
    console.log('\n👥 Demo Users:');
    console.log('   Admin: admin@ecommerce.com / admin123');
    console.log('   Viewer: viewer@ecommerce.com / viewer123');
    console.log('   Customer: customer@ecommerce.com / customer123');
    console.log('\n📚 OAuth 2.0 Features Demonstrated:');
    console.log('   ✓ JWT Token Authentication');
    console.log('   ✓ Role-Based Access Control (RBAC)');
    console.log('   ✓ Scope-Based Authorization');
    console.log('   ✓ Service-to-Service Communication');
    console.log('   ✓ Token Validation & Introspection');
    console.log('\n⏹️  Press Ctrl+C to stop all services\n');

  } catch (error) {
    console.error('❌ Failed to start services:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...');
  
  processes.forEach(({ name, process }) => {
    console.log(`Stopping ${name}...`);
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    console.log('✅ All services stopped.');
    process.exit(0);
  }, 2000);
});

// Start the application
startAll();

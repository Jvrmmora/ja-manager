// Script de inicialización para MongoDB
db = db.getSiblingDB('ja-manager');

// Crear colección de jóvenes con datos de ejemplo
db.youngs.insertMany([
  {
    fullName: "María González",
    ageRange: "19-21",
    phone: "+1234567890",
    birthday: new Date("2003-05-15"),
    profileImage: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    fullName: "Carlos Rodríguez",
    ageRange: "22-25",
    phone: "+1234567891",
    birthday: new Date("2000-08-22"),
    profileImage: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    fullName: "Ana Martínez",
    ageRange: "16-18",
    phone: "+1234567892",
    birthday: new Date("2006-12-03"),
    profileImage: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Crear índices para mejorar el rendimiento
db.youngs.createIndex({ "fullName": "text" });
db.youngs.createIndex({ "ageRange": 1 });
db.youngs.createIndex({ "birthday": 1 });
db.youngs.createIndex({ "createdAt": -1 });

print("Database initialized with sample data!");

const express = require("express");
const fs = require("fs");
const path = require("path");

let idCounter = 0;
const csvFIlePath = path.join(__dirname, "src", "database", "contacts.csv");

// function
function isValidEmail(email) {
  const emailRegex = /@.+?\..{2,}/; // Basic email pattern
  return emailRegex.test(email);
}

function findContact(id) {
  const contacts = fs.readFileSync(csvFIlePath, "utf8").split("\n");
  const contact = contacts.find((contact) => {
    const [contactId] = contact.split(",");
    return contactId === id;
  });

  if (!contact) return null;

  return contact;
}

function formattedContacts(contact) {
  const [id, firstName, lastName, email, phone, createdAt] = contact.split(",");
  return {
    id,
    firstName,
    lastName,
    email,
    phone,
    createdAt,
  };
}

function updateContat(temp,id, firstName, lastName, email, phone) {
  const [contactId, ...contact] = temp.split(",");

  const newContact = [
    contactId,
    firstName || contact[0],
    lastName || contact[1],
    email || contact[2],
    phone || contact[3],
    contact[4],
  ];

  const updatedContact = newContact.join(",");

  const contacts = fs.readFileSync(csvFIlePath, "utf8").split("\n");
  const updatedContacts = contacts.map((contact) => {
    const [contactId] = contact.split(",");
    if (contactId === id) return updatedContact;
    return contact;
  });

  fs.writeFileSync(csvFIlePath, updatedContacts.join("\n"));
};

// Create an Express Contact Backend app
const app = express();

//Middleware
app.use(express.json());


// Routes


app.get("/", (req, res) => {
  return res.end("Welcome to the Contact Backend App");
});

//GET Routes
// create a route to get all contacts
app.get("/contacts", (req, res) => {
  const { sort, order } = req.query; // Default to ascending order
  //convert to and filter out empty lines
  const contacts = fs
    .readFileSync(csvFIlePath, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "");

  const formattedContactsList = contacts.map((contact) =>
    formattedContacts(contact)
  );

  // order querry
  if (order) {
    // check if order is defined
    if (order === "asc") {
      formattedContactsList.sort((a, b) =>
        a.firstName.localeCompare(b.firstName)
      );
    } else if (order === "desc") {
      formattedContactsList.sort((a, b) =>
        b.firstName.localeCompare(a.firstName)
      );
    }
  }

  // Sort by createdAt
  if (sort) {
    // check if sort is defined
    formattedContactsList.sort((a, b) => {
      if (sort === "createdAt") {
        if (order === "asc") {
          return (
            new Date(a.createdAt) - new Date(b.createdAt) ||
            a.firstName.localeCompare(b.firstName)
          );
        } else if (order === "desc") {
          return (
            new Date(b.createdAt) - new Date(a.createdAt) ||
            b.firstName.localeCompare(a.firstName)
          );
        } else {
          res.status(400).json({ error: "Invalid order" });
        }
      }
    });
  }

  res.json(formattedContactsList);
});

// create a route to get a contact
app.get("/contacts/:id", (req, res) => {
  const { id } = req.params;

  const temp = findContact(id);

  if (!temp) return res.status(404).json({ error: "Contact not found" });

  const contact = formattedContacts(contact);

  return res.json(contact);
});


//POST Routes
// create a route to add a contact
app.post("/contacts", (req, res) => {
  const id = ++idCounter;
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || typeof firstName !== "string" || firstName.length < 3)
    return res
      .status(400)
      .json({ error: "First Name is required and must be 3 chars long" });

  if (typeof lastName !== "string" || lastName.length < 2)
    return res.status(400).json({ error: "Last Name must be 3 chars long" });

  if (typeof email !== "string" || email.length < 2 || !isValidEmail(email))
    return res.status(400).json({ error: "Enter Valid Email" });

  if (typeof phone !== "number" || phone < 10)
    return res.status(400).json({ error: "Enter Valid phone Number" });

  const createdAt = new Date().toISOString();

  const contact = `${id},${firstName},${lastName},${email},${phone},${createdAt}`;

  fs.appendFileSync(csvFIlePath, `${contact}\n`);

  return res.status(201).json({ status: "Contact Created Successfully" });
});



//PUT Routes
// create a route to update a contact
app.put("/contacts/:id", (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone } = req.body;

  const temp = findContact(id);

  if (!temp) return res.status(404).json({ error: "Contact not found" });

  updateContat(temp, id, firstName, lastName, email, phone);

  return res.status(200).json({ status: "Contact Updated Successfully" });
});


//DELETE Routes
// create a route to delete a contact
app.delete("/contacts/:id", (req, res) => {
  const { id } = req.params;

  const temp = findContact(id);

  if (!temp) return res.status(404).json({ error: "Contact not found" });

  const contacts = fs.readFileSync(csvFIlePath, "utf8").split("\n");
  const updatedContacts = contacts.filter((contact) => {
    const [contactId] = contact.split(",");
    return contactId !== id;
  });

  fs.writeFileSync(csvFIlePath, updatedContacts.join("\n"));

  return res.status(200).json({ status: "Contact Deleted Successfully" });
});



// start the server
app.listen(8000, () => {
  //initlize the csv file if it does not exist
  if (fs.existsSync(csvFIlePath)) {
    console.log("Contact database exists");
  } else {
    const headers = "id,firstName,lastName,email,phone,createdAt\n";
    fs.writeFileSync(csvFIlePath, headers);
    console.log("Contact database created");
  }

  //setting idCouner
  const contacts = fs.readFileSync(csvFIlePath, "utf8").split("\n");
  if (contacts.length > 2) { // Check if there are any contacts
    const lastContact = contacts[contacts.length - 2]; // Last line might be empty, so take the second last
    const [lastContactId] = lastContact.split(",");
    idCounter = parseInt(lastContactId);
    console.log("idCounter set to", idCounter);
  }

  // server is running on port 8000
  console.log("Server is running on port 8000");
});

/**
 *
 * GET : search all contacts : /contacts
 * GET : search a contact : /contacts/:id
 * POST : creta a contact : /contacts
 * PUT " update contact : /contacts/:id
 * DELETE : delete a contact : /contacts/:id 
* body _ JSON :
 * {
  "firstName" : "sad",
  "lastName" : "dsfs",
  "email" : "sdfds@email.com",
  "phone" : 2345678901
  }
 */

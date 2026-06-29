describe('Auth E2E', () => {
  const baseUrl = 'http://localhost:3000';
  let accessToken: string;
  let refreshToken: string;

  describe('Authentication Flow', () => {
    it('should register a new user', () => {
      cy.request('POST', `${baseUrl}/api/auth/register`, {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }).then((response) => {
        expect(response.status).to.equal(201);
        expect(response.body).to.have.property('accessToken');
        expect(response.body).to.have.property('refreshToken');
        expect(response.body.user).to.have.property('email', 'test@example.com');
        
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });
    });

    it('should login with valid credentials', () => {
      cy.request('POST', `${baseUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'password123',
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('accessToken');
        expect(response.body.user.email).to.equal('test@example.com');
      });
    });

    it('should refresh access token', () => {
      cy.request('POST', `${baseUrl}/api/auth/refresh`, {
        refreshToken,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body).to.have.property('accessToken');
        accessToken = response.body.accessToken;
      });
    });

    it('should get current user with valid token', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/auth/me`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.email).to.equal('test@example.com');
      });
    });

    it('should reject request without token', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/auth/me`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
      });
    });

    it('should reject invalid credentials', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
      });
    });
  });
});

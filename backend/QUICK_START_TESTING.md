# 🚀 Quick Start: Running Backend Tests

## ⚠️ Current Issue: Java 24 Compatibility

Your system has Java 24 installed, but the project requires Java 17 for Maven compilation.

## 🔧 Solution Options

### Option 1: Install Java 17 (Recommended)

1. **Download Java 17**:
   - Visit: https://adoptium.net/temurin/releases/?version=17
   - Download: Windows x64 JDK (.msi installer)

2. **Install Java 17**:
   - Run the installer
   - Check "Set JAVA_HOME variable"
   - Check "Add to PATH"

3. **Verify Installation**:
   ```bash
   java -version
   # Should show: openjdk version "17.x.x"
   ```

4. **Run Tests**:
   ```bash
   cd backend
   mvn clean test
   ```

### Option 2: Use IDE (Easiest - No Java Change Needed)

#### IntelliJ IDEA
1. Open `backend` folder in IntelliJ
2. Right-click on `src/test/java`
3. Select "Run 'All Tests'"
4. IntelliJ will handle Java version automatically

#### Eclipse
1. Import `backend` as Maven project
2. Right-click on test class
3. Select "Run As" → "JUnit Test"

#### VS Code
1. Install "Extension Pack for Java"
2. Open `backend` folder
3. Click "Run Test" above any test method

### Option 3: Set JAVA_HOME Temporarily

If you have Java 17 installed elsewhere:

```bash
# Find Java installations
where java

# Set JAVA_HOME for this session
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

# Verify
java -version

# Run tests
cd backend
mvn clean test
```

## 📋 Test Execution Commands

### Run All Tests
```bash
mvn test
```

### Run Specific Test Class
```bash
mvn test -Dtest=CreditScoringServiceTest
mvn test -Dtest=RiskModelServiceTest
mvn test -Dtest=SignatureServiceTest
mvn test -Dtest=RiskControllerTest
```

### Run Single Test Method
```bash
mvn test -Dtest=CreditScoringServiceTest#testApplyRepaymentBonus_ExistingUser
```

### Run with Coverage Report
```bash
mvn test jacoco:report
# Open: target/site/jacoco/index.html
```

### Skip Tests (for compilation only)
```bash
mvn clean compile -DskipTests
```

## 📊 Expected Output

When tests run successfully:

```
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.credlayer.backend.service.CreditScoringServiceTest
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.5 s
[INFO] 
[INFO] Running com.credlayer.backend.service.RiskModelServiceTest
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.3 s
[INFO] 
[INFO] Running com.credlayer.backend.service.SignatureServiceTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.4 s
[INFO] 
[INFO] Running com.credlayer.backend.controller.RiskControllerTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.6 s
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 44, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  5.234 s
```

## 🐛 Troubleshooting

### Error: "Fatal error compiling: java.lang.ExceptionInInitializerError"
**Cause**: Java 24 incompatibility
**Solution**: Use Java 17 (see Option 1 above)

### Error: "Cannot find symbol" or compilation errors
**Cause**: Missing dependencies
**Solution**: 
```bash
mvn clean install -DskipTests
mvn test
```

### Error: "No tests were executed"
**Cause**: Test classes not in correct package
**Solution**: Verify test files are in `src/test/java/com/credlayer/backend/`

### Error: "Could not find or load main class"
**Cause**: Classpath issue
**Solution**: 
```bash
mvn clean
mvn test
```

## 📁 Test File Locations

```
backend/
├── src/
│   ├── main/java/com/credlayer/backend/
│   │   ├── service/
│   │   │   ├── CreditScoringService.java
│   │   │   ├── RiskModelService.java
│   │   │   └── SignatureService.java
│   │   └── controller/
│   │       └── RiskController.java
│   └── test/java/com/credlayer/backend/
│       ├── service/
│       │   ├── CreditScoringServiceTest.java ✅
│       │   ├── RiskModelServiceTest.java ✅
│       │   └── SignatureServiceTest.java ✅
│       └── controller/
│           └── RiskControllerTest.java ✅
└── pom.xml
```

## ✅ Verification Steps

After running tests, verify:

1. **All tests pass**: Check for "BUILD SUCCESS"
2. **No failures**: "Failures: 0, Errors: 0"
3. **44 tests executed**: "Tests run: 44"
4. **Coverage report** (optional): Open `target/site/jacoco/index.html`

## 🎯 What Each Test Class Does

### CreditScoringServiceTest (12 tests)
- Tests credit score updates
- Validates score boundaries (0-1000)
- Tests risk band transitions

### RiskModelServiceTest (14 tests)
- Tests loan term calculations
- Validates all risk bands (A, B, C, D)
- Tests signature generation

### SignatureServiceTest (10 tests)
- Tests ECDSA signature generation
- Validates cryptographic correctness
- Tests edge cases

### RiskControllerTest (8 tests)
- Tests REST API endpoints
- Validates request/response handling
- Tests error scenarios

## 📞 Need Help?

If tests still don't run:

1. Check Java version: `java -version` (should be 17)
2. Check Maven version: `mvn -version`
3. Clean and rebuild: `mvn clean install -DskipTests`
4. Try IDE option (IntelliJ/Eclipse)
5. Check logs in `target/surefire-reports/`

## 🎉 Success Criteria

You'll know tests are working when you see:
- ✅ "BUILD SUCCESS" message
- ✅ "Tests run: 44, Failures: 0, Errors: 0"
- ✅ Green checkmarks in IDE
- ✅ Coverage report generated (if using jacoco)

---

**Quick Command Reference**:
```bash
# Install Java 17, then:
cd backend
mvn clean test                    # Run all tests
mvn test -Dtest=*ServiceTest      # Run all service tests
mvn test jacoco:report            # Run with coverage
```

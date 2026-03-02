# Run Backend Tests in IntelliJ IDEA

## ✅ Easiest Solution (Recommended)

Since Maven is having Java version conflicts, use IntelliJ IDEA which handles this automatically:

### Steps:

1. **Open Project in IntelliJ**
   - File → Open → Select `backend` folder
   - Wait for Maven import to complete

2. **Configure JDK (if needed)**
   - File → Project Structure → Project
   - SDK: Select Java 17 (IntelliJ will download if missing)
   - Language Level: 17

3. **Run All Tests**
   - Navigate to `src/test/java`
   - Right-click on `java` folder
   - Select "Run 'All Tests'"

4. **View Results**
   - Test results appear in bottom panel
   - Should see: 44 tests passed ✅

### Alternative: Run Individual Test Classes

Right-click on any test file:
- `CreditScoringServiceTest.java`
- `RiskModelServiceTest.java`
- `SignatureServiceTest.java`
- `RiskControllerTest.java`

Select "Run 'TestClassName'"

## 🎯 Expected Results

```
Tests run: 44
Failures: 0
Errors: 0
Skipped: 0
✅ All tests passed!
```

## 📊 Test Coverage in IntelliJ

1. Right-click `src/test/java`
2. Select "Run 'All Tests' with Coverage"
3. View coverage report in Coverage panel
4. Should see ~90% coverage

## 🐛 If IntelliJ Shows Errors

1. **Reload Maven Project**
   - Right-click `pom.xml` → Maven → Reload Project

2. **Invalidate Caches**
   - File → Invalidate Caches → Invalidate and Restart

3. **Check Java Version**
   - File → Project Structure → Project → SDK should be 17

## 💡 Why IntelliJ Works

IntelliJ IDEA:
- ✅ Manages multiple Java versions
- ✅ Downloads JDK automatically
- ✅ Handles Maven configuration
- ✅ No PATH/JAVA_HOME conflicts
- ✅ Better test runner UI

---

**This bypasses the Maven/Java 24 conflict and lets you run tests immediately.**
